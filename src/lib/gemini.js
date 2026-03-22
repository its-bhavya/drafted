const MODEL = 'gemini-flash-latest'

export function getApiKey() {
  return import.meta.env.VITE_GEMINI_KEY || ''
}

export async function generateDiagram(userText, currentState) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('No API key — add VITE_GEMINI_KEY to your .env file')

  const trimmedState = {
    nodes: currentState.nodes.map(({ id, label, type, sub }) => ({ id, label, type, sub })),
    edges: currentState.edges,
  }

  const prompt = `You are a JSON-only system design diagram API. Output ONLY a single JSON object. No prose, no explanation, no markdown, no code fences. Your entire response must start with { and end with }.

Schema:
{"patch":false,"nodes":[{"id":"1","label":"Name","sub":"optional","type":"service","x":0,"y":0}],"edges":[{"from":"1","to":"2","label":"optional"}]}

Types: service, database, queue, client, gateway
Positions: set x and y to 0 for all nodes — layout is handled client-side.
patch:true = add/modify existing diagram (new nodes only, new IDs starting at 100+).
patch:false = full replacement.

CURRENT: ${JSON.stringify(trimmedState)}
INSTRUCTION: "${userText}"`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      }),
    }
  )

  const data = await res.json()
  if (data.error) throw new Error(data.error.message)

  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  console.debug('[gemini] raw:', raw)

  const start = raw.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in response')

  let depth = 0, end = -1
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === '{') depth++
    else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end === -1) throw new Error('Incomplete JSON in response')

  return JSON.parse(raw.slice(start, end + 1))
}
