import { useState } from 'react'
import { useSpeech } from '../hooks/useSpeech'
import styles from './InputBar.module.css'

export default function InputBar({ onSubmit, onPartial, onFinal, status }) {
  const [text, setText]           = useState('')
  const [recording, setRecording] = useState(false)

  const { transcript, supported, start, stop } = useSpeech(
    (partial) => onPartial?.(partial),   // fires on every 1.5s pause while speaking
    (final)   => onFinal?.(final),       // fires on Stop
  )

  const handleMicClick = () => {
    if (recording) {
      stop()
      setRecording(false)
    } else {
      start()
      setRecording(true)
    }
  }

  const handleSend = () => {
    const val = text.trim()
    if (!val) return
    onSubmit(val)
    setText('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const isLoading   = status.type === 'loading'
  const isStreaming = status.type === 'streaming'

  return (
    <footer className={styles.bar}>
      <div className={`${styles.transcript} ${recording ? styles.transcriptActive : ''}`}>
        {recording
          ? (transcript || 'Listening…')
          : status.text
        }
        {isStreaming && !recording && (
          <span className={styles.streamDot} />
        )}
      </div>

      <div className={styles.row}>
        {supported && (
          <button
            className={`${styles.mic} ${recording ? styles.micActive : ''}`}
            onClick={handleMicClick}
            disabled={isLoading}
            title={recording ? 'Stop and send' : 'Start recording'}
          >
            <span className={styles.micDot} />
            <span>{recording ? 'Stop' : 'Record'}</span>
          </button>
        )}

        <input
          className={styles.input}
          type="text"
          placeholder='Or type: "Add a load balancer in front of the API"'
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          disabled={isLoading || isStreaming}
        />

        <button
          className={`${styles.send} ${isLoading ? styles.sendLoading : ''}`}
          onClick={handleSend}
          disabled={isLoading || isStreaming || !text.trim()}
        >
          {isLoading ? <span className={styles.spinner} /> : '↗'}
        </button>
      </div>
    </footer>
  )
}
