"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition"

export default function InterviewPage() {
  const router = useRouter()
  const params = useParams()
  const interviewId = params.id as string

  const [question, setQuestion] = useState("")
  const [questionId, setQuestionId] = useState("")
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [feedback, setFeedback] = useState<any>(null)
  const [finished, setFinished] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [initialLoading, setInitialLoading] = useState(true)
  const [mode, setMode] = useState<"text" | "voice">("text")
  const [speaking, setSpeaking] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition()

  useEffect(() => {
    if (mode === "voice" && transcript) {
      setAnswer(transcript)
    }
  }, [transcript, mode])

  const speakQuestion = (text: string) => {
    if (typeof window === "undefined") return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => {
      setSpeaking(false)
      if (mode === "voice") startCountdown()
    }
    window.speechSynthesis.speak(utterance)
  }

  const startCountdown = () => {
    setCountdown(3)
    let count = 3
    countdownRef.current = setInterval(() => {
      count--
      setCountdown(count)
      if (count === 0) {
        clearInterval(countdownRef.current!)
        setCountdown(null)
        SpeechRecognition.startListening({ continuous: true })
      }
    }, 1000)
  }

  useEffect(() => {
    fetch(`/api/interview/${interviewId}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestion(data.question)
        setQuestionId(data.questionId)
        setInitialLoading(false)
      })
  }, [interviewId])

  useEffect(() => {
    if (question && mode === "voice" && !initialLoading) {
      speakQuestion(question)
    }
  }, [question, mode, initialLoading])

  const handleModeSwitch = (newMode: "text" | "voice") => {
    setMode(newMode)
    SpeechRecognition.stopListening()
    window.speechSynthesis.cancel()
    setSpeaking(false)
    setCountdown(null)
    resetTranscript()
    setAnswer("")
    if (newMode === "voice" && question) {
      setTimeout(() => speakQuestion(question), 500)
    }
  }

  const handleStartListening = () => {
  window.speechSynthesis.cancel()
  setSpeaking(false)
  resetTranscript()
  setAnswer("")
  SpeechRecognition.startListening({ continuous: true })
}

  const handleStopListening = () => {
    SpeechRecognition.stopListening()
  }

  const handleSubmit = async () => {
    if (!answer.trim()) return
    setLoading(true)
    setFeedback(null)
    SpeechRecognition.stopListening()
    window.speechSynthesis.cancel()

    const res = await fetch(`/api/interview/${interviewId}/question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer, currentQuestionId: questionId })
    })

    const data = await res.json()

    if (data.finished) {
      setFinished(true)
      setFinalScore(data.score)
      setFeedback(data.evaluation)
    } else {
      setFeedback(data.evaluation)
      setTimeout(() => {
        setQuestion(data.nextQuestion)
        setQuestionId(data.nextQuestionId)
        setAnswer("")
        resetTranscript()
        setQuestionNumber((prev) => prev + 1)
        setFeedback(null)
        setLoading(false)
      }, 3000)
    }

    setLoading(false)
  }

  if (initialLoading) {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
          <p style={{ color: "#888" }}>Preparing your interview...</p>
        </div>
      </main>
    )
  }

  if (finished) {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", fontFamily: "Arial", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: "600px", width: "100%", padding: "0 16px", textAlign: "center" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>
            {finalScore >= 8 ? "🏆" : finalScore >= 6 ? "👍" : "💪"}
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>Interview Complete!</h1>
          <p style={{ color: "#888", marginBottom: "32px" }}>Here is how you did</p>
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "32px", marginBottom: "24px" }}>
            <div style={{ fontSize: "64px", fontWeight: "bold", color: finalScore >= 8 ? "#22c55e" : finalScore >= 6 ? "#60a5fa" : "#f59e0b", marginBottom: "8px" }}>
              {finalScore}/10
            </div>
            <div style={{ color: "#888", marginBottom: "24px" }}>Overall Score</div>
            {feedback && (
              <div style={{ textAlign: "left" }}>
                <p style={{ color: "#ccc", marginBottom: "16px", lineHeight: "1.6" }}>{feedback.feedback}</p>
                {feedback.strengths?.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ color: "#22c55e", fontWeight: "600", marginBottom: "8px" }}>✅ Strengths</div>
                    {feedback.strengths.map((s: string, i: number) => (
                      <div key={i} style={{ color: "#ccc", fontSize: "14px", marginBottom: "4px" }}>• {s}</div>
                    ))}
                  </div>
                )}
                {feedback.improvements?.length > 0 && (
                  <div>
                    <div style={{ color: "#f59e0b", fontWeight: "600", marginBottom: "8px" }}>🎯 Areas to Improve</div>
                    {feedback.improvements.map((s: string, i: number) => (
                      <div key={i} style={{ color: "#ccc", fontSize: "14px", marginBottom: "4px" }}>• {s}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button onClick={() => router.push("/interview/new")} style={{ padding: "12px 24px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>
              Practice Again
            </button>
            <button onClick={() => router.push("/dashboard")} style={{ padding: "12px 24px", background: "transparent", color: "#ccc", border: "1px solid #333", borderRadius: "8px", cursor: "pointer" }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", fontFamily: "Arial" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", borderBottom: "1px solid #222", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ color: "#60a5fa", fontSize: "20px", fontWeight: "bold" }}>InterviewAI</div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "4px", gap: "4px" }}>
            <button
              onClick={() => handleModeSwitch("text")}
              style={{ padding: "8px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "600", background: mode === "text" ? "#2563eb" : "transparent", color: mode === "text" ? "white" : "#888" }}
            >
              ✏️ Text
            </button>
            <button
              onClick={() => handleModeSwitch("voice")}
              style={{ padding: "8px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "600", background: mode === "voice" ? "#2563eb" : "transparent", color: mode === "voice" ? "white" : "#888" }}
            >
              🎤 Voice
            </button>
          </div>
          <div style={{ color: "#888", fontSize: "14px" }}>Question {questionNumber} of 5</div>
        </div>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ background: "#222", borderRadius: "4px", height: "6px", marginBottom: "40px" }}>
          <div style={{ background: "#2563eb", height: "100%", borderRadius: "4px", width: `${(questionNumber / 5) * 100}%`, transition: "width 0.3s" }} />
        </div>

        <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "28px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ fontSize: "24px" }}>🤖</div>
            <div style={{ color: "#60a5fa", fontWeight: "600" }}>AI Interviewer</div>
            {speaking && (
              <div style={{ display: "flex", gap: "3px", alignItems: "center", marginLeft: "8px" }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ width: "3px", height: `${8 + i * 4}px`, background: "#60a5fa", borderRadius: "2px" }} />
                ))}
                <span style={{ color: "#60a5fa", fontSize: "12px", marginLeft: "6px" }}>Speaking...</span>
              </div>
            )}
          </div>
          <p style={{ fontSize: "18px", lineHeight: "1.6", color: "#f0f0f0" }}>{question}</p>
          {mode === "voice" && (
            <button
              onClick={() => speakQuestion(question)}
              style={{ marginTop: "12px", padding: "6px 14px", background: "transparent", border: "1px solid #333", color: "#888", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
            >
              🔊 Replay Question
            </button>
          )}
        </div>

        {feedback && (
          <div style={{ background: "#0f2a0f", border: "1px solid #22c55e", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
            <div style={{ color: "#22c55e", fontWeight: "600", marginBottom: "8px" }}>Score: {feedback.score}/10</div>
            <p style={{ color: "#ccc", fontSize: "14px", lineHeight: "1.6" }}>{feedback.feedback}</p>
          </div>
        )}

        {!feedback && mode === "text" && (
          <div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={6}
              style={{ width: "100%", padding: "16px", background: "#111", border: "1px solid #333", borderRadius: "12px", color: "white", fontSize: "15px", lineHeight: "1.6", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "Arial" }}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !answer.trim()}
              style={{ marginTop: "16px", width: "100%", padding: "14px", background: loading || !answer.trim() ? "#1d4ed8" : "#2563eb", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: loading || !answer.trim() ? "not-allowed" : "pointer", opacity: !answer.trim() ? 0.6 : 1 }}
            >
              {loading ? "Evaluating..." : "Submit Answer →"}
            </button>
          </div>
        )}

        {!feedback && mode === "voice" && (
          <div>
            {!browserSupportsSpeechRecognition && (
              <div style={{ background: "#2d1515", border: "1px solid #ef4444", color: "#ef4444", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
                ⚠️ Voice not supported. Please use Chrome.
              </div>
            )}

            {countdown !== null && (
              <div style={{ textAlign: "center", padding: "32px", background: "#111", border: "1px solid #222", borderRadius: "12px", marginBottom: "16px" }}>
                <div style={{ fontSize: "64px", fontWeight: "bold", color: "#60a5fa" }}>{countdown}</div>
                <div style={{ color: "#888", marginTop: "8px" }}>Starting microphone...</div>
              </div>
            )}

            {countdown === null && (
              <div>
                <div style={{ background: "#111", border: `1px solid ${listening ? "#22c55e" : "#333"}`, borderRadius: "12px", padding: "24px", marginBottom: "16px", textAlign: "center" }}>
                  {listening ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "center", gap: "4px", marginBottom: "16px" }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} style={{ width: "4px", height: "24px", background: "#22c55e", borderRadius: "2px" }} />
                        ))}
                      </div>
                      <div style={{ color: "#22c55e", fontWeight: "600", marginBottom: "8px" }}>🎤 Listening...</div>
                      <div style={{ color: "#ccc", fontSize: "14px", minHeight: "60px", lineHeight: "1.6", textAlign: "left", background: "#0a0a0a", padding: "12px", borderRadius: "8px" }}>
                        {transcript || "Start speaking..."}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎤</div>
                      <div style={{ color: "#888", fontSize: "14px" }}>
                        {answer ? "Recording stopped. Review your answer below." : "Click the button to start speaking"}
                      </div>
                    </div>
                  )}
                </div>

                {answer && !listening && (
                  <div style={{ background: "#111", border: "1px solid #333", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                    <div style={{ color: "#888", fontSize: "12px", marginBottom: "8px" }}>Your Answer:</div>
                    <p style={{ color: "#ccc", fontSize: "14px", lineHeight: "1.6" }}>{answer}</p>
                    <button
                      onClick={() => { resetTranscript(); setAnswer("") }}
                      style={{ marginTop: "8px", padding: "4px 12px", background: "transparent", border: "1px solid #333", color: "#888", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                    >
                      🗑️ Clear & Re-record
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "12px" }}>
                  {!listening ? (
                    <button
                      onClick={handleStartListening}
                      style={{ flex: 1, padding: "14px", background: "#14532d", border: "1px solid #22c55e", color: "#22c55e", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
                    >
                      🎤 Start Speaking
                    </button>
                  ) : (
                    <button
                      onClick={handleStopListening}
                      style={{ flex: 1, padding: "14px", background: "#2d1515", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
                    >
                      ⏹️ Stop Recording
                    </button>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !answer.trim() || listening}
                    style={{ flex: 1, padding: "14px", background: loading || !answer.trim() || listening ? "#1a1a1a" : "#2563eb", color: loading || !answer.trim() || listening ? "#555" : "white", border: "1px solid #333", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: loading || !answer.trim() || listening ? "not-allowed" : "pointer" }}
                  >
                    {loading ? "Evaluating..." : "Submit Answer →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.5); }
        }
      `}</style>
    </main>
  )
}