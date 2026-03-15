"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

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

  useEffect(() => {
    // Load the first question
    fetch(`/api/interview/${interviewId}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestion(data.question)
        setQuestionId(data.questionId)
        setInitialLoading(false)
      })
  }, [interviewId])

  const handleSubmit = async () => {
    if (!answer.trim()) return
    setLoading(true)
    setFeedback(null)

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
          <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            Interview Complete!
          </h1>
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
            <button
              onClick={() => router.push("/interview/new")}
              style={{ padding: "12px 24px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
            >
              Practice Again
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              style={{ padding: "12px 24px", background: "transparent", color: "#ccc", border: "1px solid #333", borderRadius: "8px", cursor: "pointer" }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", fontFamily: "Arial" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", borderBottom: "1px solid #222" }}>
        <div style={{ color: "#60a5fa", fontSize: "20px", fontWeight: "bold" }}>InterviewAI</div>
        <div style={{ color: "#888", fontSize: "14px" }}>Question {questionNumber} of 5</div>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 32px" }}>

        {/* Progress Bar */}
        <div style={{ background: "#222", borderRadius: "4px", height: "6px", marginBottom: "40px" }}>
          <div style={{ background: "#2563eb", height: "100%", borderRadius: "4px", width: `${(questionNumber / 5) * 100}%`, transition: "width 0.3s" }} />
        </div>

        {/* Question */}
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "28px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ fontSize: "24px" }}>🤖</div>
            <div style={{ color: "#60a5fa", fontWeight: "600" }}>AI Interviewer</div>
          </div>
          <p style={{ fontSize: "18px", lineHeight: "1.6", color: "#f0f0f0" }}>{question}</p>
        </div>

        {/* Feedback after answer */}
        {feedback && (
          <div style={{ background: "#0f2a0f", border: "1px solid #22c55e", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
            <div style={{ color: "#22c55e", fontWeight: "600", marginBottom: "8px" }}>
              Score: {feedback.score}/10
            </div>
            <p style={{ color: "#ccc", fontSize: "14px", lineHeight: "1.6" }}>{feedback.feedback}</p>
          </div>
        )}

        {/* Answer Input */}
        {!feedback && (
          <div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={6}
              style={{
                width: "100%",
                padding: "16px",
                background: "#111",
                border: "1px solid #333",
                borderRadius: "12px",
                color: "white",
                fontSize: "15px",
                lineHeight: "1.6",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "Arial"
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={loading || !answer.trim()}
              style={{
                marginTop: "16px",
                width: "100%",
                padding: "14px",
                background: loading || !answer.trim() ? "#1d4ed8" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading || !answer.trim() ? "not-allowed" : "pointer",
                opacity: !answer.trim() ? 0.6 : 1
              }}
            >
              {loading ? "Evaluating..." : "Submit Answer →"}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}