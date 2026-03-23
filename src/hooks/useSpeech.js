import { useState, useRef, useCallback, useEffect } from 'react'

const STREAMING_DEBOUNCE_MS = 1500  // fire after 1.5s pause in speech

export function useSpeech(onPartialResult, onFinalResult) {
  const [listening, setListening]   = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported, setSupported]   = useState(true)

  const recognitionRef  = useRef(null)
  const accRef          = useRef('')
  const debounceRef     = useRef(null)
  const lastSentRef     = useRef('')        // track what we last sent to avoid duplicates
  const onPartialRef    = useRef(onPartialResult)
  const onFinalRef      = useRef(onFinalResult)

  useEffect(() => { onPartialRef.current = onPartialResult }, [onPartialResult])
  useEffect(() => { onFinalRef.current   = onFinalResult   }, [onFinalResult])

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }

    const r = new SR()
    r.continuous     = true
    r.interimResults = true

    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) accRef.current += e.results[i][0].transcript + ' '
        else interim = e.results[i][0].transcript
      }
      const full = (accRef.current + interim).trim()
      setTranscript(full)

      // Debounced streaming update — fires after 1.5s pause
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const current = accRef.current.trim()
        if (current && current !== lastSentRef.current) {
          lastSentRef.current = current
          onPartialRef.current(current)
        }
      }, STREAMING_DEBOUNCE_MS)
    }

    r.onerror = () => setListening(false)
    r.onend   = () => setListening(false)

    recognitionRef.current = r
    return () => { try { r.stop() } catch (_) {} }
  }, [])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    accRef.current    = ''
    lastSentRef.current = ''
    setTranscript('')
    clearTimeout(debounceRef.current)
    try { recognitionRef.current.start(); setListening(true) } catch (_) {}
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    clearTimeout(debounceRef.current)
    try { recognitionRef.current.stop() } catch (_) {}
    setListening(false)
    const final = accRef.current.trim()
    if (final) onFinalRef.current(final)
  }, [])

  return { listening, transcript, supported, start, stop }
}
