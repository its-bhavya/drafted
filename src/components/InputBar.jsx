import { useState } from 'react'
import { useSpeech } from '../hooks/useSpeech'
import styles from './InputBar.module.css'

export default function InputBar({ onSubmit, status }) {
  const [text, setText]         = useState('')
  const [recording, setRecording] = useState(false)

  const { transcript, supported, start, stop } = useSpeech((result) => {
    onSubmit(result)
  })

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isLoading = status.type === 'loading'

  return (
    <footer className={styles.bar}>
      <div className={styles.transcript} data-active={recording || undefined}>
        {recording
          ? (transcript || 'Listening...')
          : status.text
        }
      </div>

      <div className={styles.row}>
        {supported && (
          <button
            className={`${styles.mic} ${recording ? styles.micActive : ''}`}
            onClick={handleMicClick}
            disabled={isLoading}
            title={recording ? 'Stop recording' : 'Start recording'}
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
          disabled={isLoading}
        />

        <button
          className={`${styles.send} ${isLoading ? styles.sendLoading : ''}`}
          onClick={handleSend}
          disabled={isLoading || !text.trim()}
        >
          {isLoading ? <span className={styles.spinner} /> : '↗'}
        </button>
      </div>
    </footer>
  )
}
