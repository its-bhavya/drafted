# Drafted

**Drafted** is a voice-powered system design diagram tool. Describe your architecture out loud or type it in, and watch the diagram build itself in real time. Refine it incrementally, edit nodes and arrows manually, and export when you're done.

---

## Live Demo

🔗 [drafted-six.vercel.app](https://drafted-six.vercel.app) 

---

## What it does

- **Voice-to-diagram** — press Record, describe your system, press Stop. Drafted sends your speech to Gemini and renders the diagram instantly.
- **Incremental updates** — say *"add a Redis cache between the API and database"* and it patches the existing diagram without redrawing everything.
- **Manual editing** — double-click any node to edit its label, subtitle, and type. Click any arrow to edit its label or delete it. Draw new arrows between nodes. Add blank nodes manually.
- **Auto layout** — nodes are automatically arranged into a clean layered graph on every update. No overlapping boxes.
- **Pan & zoom** — scroll to zoom, drag the background to pan. Fit-to-screen button always available.
- **Multiple projects** — create and switch between separate diagrams from the sidebar. Each project is saved independently.
- **Light & dark mode** — toggle from the toolbar. Persisted across sessions.
- **Export** — download your diagram as SVG, PNG, or JPEG.
- **Undo** — every change (AI-generated or manual) is undoable.

---

## How it works

1. Your speech is transcribed locally in the browser using the **Web Speech API** — nothing is sent to a server for transcription.
2. The transcript (plus the current diagram state) is sent to the latest **Gemini Flash Model** via the Google Generative Language API.
3. Gemini returns a JSON object describing the nodes and edges to add or replace.
4. The JSON is parsed, merged into the current diagram state, and run through a **layered auto-layout engine** (Kahn's algorithm + barycenter ordering) to produce clean non-overlapping positions.
5. The diagram is rendered as **absolutely positioned HTML nodes** with **SVG edges** drawn between their borders.
6. All project state is persisted to **localStorage** — no backend, no database.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| AI | Gemini Flash (Currently 3.0) (Google Generative Language API) |
| Speech | Web Speech API (browser-native) |
| Layout | Custom layered graph engine |
| Rendering | HTML + SVG |
| Persistence | localStorage |
| Styling | CSS Modules |
| Export | Canvas API (PNG/JPEG), SVG serialization |

---

## Local setup

**Prerequisites:** Node.js 18+

**1. Clone the repo**
```bash
git clone https://github.com/its-bhavya/drafted.git
cd drafted
```

**2. Install dependencies**
```bash
npm install
```

**3. Add your Gemini API key**

Create a `.env` file in the project root:
```
VITE_GEMINI_KEY=AIzaSy...
```

Get a free key at [aistudio.google.com](https://aistudio.google.com) — no billing required for Gemini Flash on the free tier.

**4. Run the dev server**
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

**5. Build for production**
```bash
npm run build
```

Output goes to `dist/`.

---

## Usage

**Voice input**
1. Click **Record** — the button turns red and starts listening
2. Speak your system design (e.g. *"React frontend connected to a Node API, which reads from a Postgres database"*)
3. Click **Stop** — the transcript is sent to Gemini and the diagram appears

**Text input**
Type in the input bar and press Enter or click ↗.

**Refining the diagram**
Each follow-up prompt patches the existing diagram:
- *"Add a Redis cache between the API and database"*
- *"Put a load balancer in front of the API"*
- *"Add a message queue between the order service and notification service"*

**Manual editing**
- **Double-click** a node to edit its label, subtitle, and type
- **Click** an arrow to edit its label or delete it
- **⤳ button** to enter connect mode and draw new arrows
- **＋ button** to add a blank node

**Keyboard shortcuts**
- `Enter` — send text input
- `Escape` — close edit popover

---

## Deploying to Vercel

```bash
npm install -g vercel
vercel
```

Add your environment variable in the Vercel dashboard:
`Settings → Environment Variables → VITE_GEMINI_KEY`

Then redeploy:
```bash
vercel --prod
```

---

## Notes

- Voice input works in **Chrome and Edge** only (Web Speech API limitation — Firefox does not support it)
- The Gemini API key is baked into the client bundle at build time. For a public deployment, consider wrapping it in a serverless proxy function so the key isn't visible in devtools
- All data is stored in your browser's localStorage — clearing browser data will erase your projects

---

## License

MIT
