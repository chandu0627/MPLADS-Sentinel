import { useEffect, useRef, useState } from 'react'

const responses = {
  'What is MPLADS Sentinel?': 'MPLADS Sentinel is an AI-powered public fund risk and anomaly intelligence system. It analyzes available MPLADS data to identify unusual patterns and records that may deserve further human review.',
  'What does HIGH risk mean?': 'HIGH risk means the record shows a comparatively unusual statistical pattern according to the anomaly detection model. It should receive higher priority for human review. HIGH risk is not proof of fraud.',
  'How is the risk score calculated?': 'The current system combines two signals: Isolation Forest anomaly detection and a robust median/MAD-based comparison. These signals are combined into an anomaly score and grouped into LOW, MEDIUM, or HIGH risk levels.',
  'Does HIGH risk mean fraud?': 'No. A HIGH risk score is a statistical anomaly indicator, not a fraud finding. MPLADS Sentinel supports investigation and prioritization. Final conclusions require human or official verification.',
  'What does NOT ASSESSED mean?': 'NOT ASSESSED means an anomaly score was not calculated for that record because the required value was missing or the record is a summary/non-geographic record. The system does not invent missing values.',
  'What data does the system use?': 'The current system uses available public aggregate MPLADS datasets, including MP/constituency allocation records and state-level Annexure information containing expenditure and completed-work indicators where available. Project/work-level analysis requires an authorized project-level work register.',
}

const quickQuestions = Object.keys(responses)
const fallback = 'I can currently help explain MPLADS Sentinel, risk levels, anomaly scoring, the available data, and the meaning of alerts. Try one of the suggested questions.'

function SentinelAssist() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  const sendMessage = (question) => {
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) return

    setConversation((current) => [
      ...current,
      { id: `${Date.now()}-user`, sender: 'user', text: trimmedQuestion },
      { id: `${Date.now()}-assistant`, sender: 'assistant', text: responses[trimmedQuestion] || fallback },
    ])
    setMessage('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage(message)
  }

  return (
    <div className="sentinel-assist">
      {isOpen ? (
        <section className="sentinel-assist-panel" aria-labelledby="sentinel-assist-title">
          <header className="sentinel-assist-header">
            <div>
              <h2 id="sentinel-assist-title">Sentinel Assist</h2>
              <p>MPLADS monitoring support</p>
            </div>
            <button className="sentinel-assist-close" type="button" onClick={() => setIsOpen(false)} aria-label="Close Sentinel Assist" title="Close Sentinel Assist">&times;</button>
          </header>

          <div className="sentinel-assist-messages" aria-live="polite" aria-label="Sentinel Assist conversation">
            <div className="sentinel-assist-message assistant-message">Welcome. I can explain the available MPLADS data, risk levels, anomaly scoring, and alerts using the current system definitions.</div>
            {conversation.map((item) => <div className={`sentinel-assist-message ${item.sender}-message`} key={item.id}>{item.text}</div>)}
            <div ref={messagesEndRef} />
          </div>

          <div className="sentinel-assist-quick-list" aria-label="Suggested questions">
            {quickQuestions.map((question) => <button type="button" key={question} onClick={() => sendMessage(question)}>{question}</button>)}
          </div>

          <form className="sentinel-assist-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="sentinel-assist-input">Ask Sentinel Assist</label>
            <input ref={inputRef} id="sentinel-assist-input" type="text" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask about MPLADS monitoring" autoComplete="off" />
            <button type="submit" aria-label="Send message" title="Send message" disabled={!message.trim()}>Send</button>
          </form>
          <div className="sentinel-assist-footer-row">
            <button className="sentinel-assist-clear" type="button" onClick={() => setConversation([])}>Clear chat</button>
            <p className="sentinel-assist-footer">Sentinel Assist provides project guidance and explanations. Risk indicators require human review.</p>
          </div>
        </section>
      ) : null}

      <button className="sentinel-assist-toggle" type="button" onClick={() => setIsOpen((open) => !open)} aria-label="Open Sentinel Assist" aria-expanded={isOpen} title="Open Sentinel Assist">
        <span className="sentinel-assist-icon" aria-hidden="true" />
      </button>
    </div>
  )
}

export default SentinelAssist