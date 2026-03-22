import { useState, useRef, useCallback, useEffect } from 'react'

export function useSpeech(onResult) {
  const [listening, setListening]   = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported, setSupported]   = useState(true)
  const recognitionRef = useRef(null)
  const accRef         = useRef('')
  const onResultRef    = useRef(onResult)

  // Keep ref current so stop() never calls a stale onSubmit
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }

    const r = new SR()
    r.continuous      = true
    r.interimResults  = true

    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) accRef.current += e.results[i][0].transcript + ' '
        else interim = e.results[i][0].transcript
      }
      setTranscript(accRef.current + interim)
    }

    r.onerror = () => setListening(false)
    r.onend   = () => setListening(false)

    recognitionRef.current = r
    return () => { try { r.stop() } catch (_) {} }
  }, [])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    accRef.current = ''
    setTranscript('')
    try { recognitionRef.current.start(); setListening(true) } catch (_) {}
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    try { recognitionRef.current.stop() } catch (_) {}
    setListening(false)
    const final = accRef.current.trim()
    if (final) onResultRef.current(final)
  }, [])

  return { listening, transcript, supported, start, stop }
}
