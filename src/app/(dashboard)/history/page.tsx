"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Question {
  id: string
  content: string
  answer: string | null
  score: number | null
  feedback: string | null
  order: number
}

interface Interview {
  id: string
  role: string
  difficulty: string
  status: string
  score: number | null
  createdAt: string
  completedAt: string | null
  questions: Question[]
}

export default function HistoryPage() {
  const router = useRouter()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/interviews?include=questions")
      .then((res) => res.json())
      .then((data) => {
        setInterviews(data.interviews || [])
        setLoading(false)
      })
  }, [])

  const getDifficultyColor = (difficulty: string) => {
    if (difficulty === "Easy") return { bg: "#14532d", color: "#86efac", border: "#22c55e" }
    if (difficulty === "Medium") return { bg: "#1e3a5f", color: "#93c5fd", border: "#2563eb" }
    return { bg: "#2d1515", color: "#fca5a5", border: "#ef4444" }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "#22c55e"
    if (score >= 6) return "#60a5fa"
    if (score >= 4) return "#f59e0b"
    return "#ef4444"
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial" }}>
        <p style={{ color: "#888" }}>Loading history...</p>
      </main>
    )
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", fontFamily: "Arial" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", borderBottom: "1px solid #222" }}>
        <div style={{ color: "#60a5fa", fontSize: "20px", fontWeight: "bold" }}>InterviewAI</div>
        <button
          onClick={() => router.push("/dashboard")}
          style={{ padding: "8px 16px", background: "transparent", border: "1px solid #333", color: "#ccc", borderRadius: "8px", cursor: "pointer" }}
        >
          ← Dashboard
        </button>
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>Interview History</h1>
            <p style={{ color: "#888" }}>{interviews.length} total interviews</p>
          </div>
          <button
            onClick={() => router.push("/interview/new")}
            style={{ padding: "10px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
          >
            + New Interview
          </button>
        </div>

        {interviews.length === 0 ? (
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "60px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
            <p style={{ color: "#888", marginBottom: "16px" }}>No interviews yet</p>
            <button
              onClick={() => router.push("/interview/new")}
              style={{ padding: "10px 24px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
            >
              Start First Interview
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {interviews.map((interview) => {
              const diffStyle = getDifficultyColor(interview.difficulty)
              const isExpanded = expanded === interview.id

              return (
                <div
                  key={interview.id}
                  style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", overflow: "hidden" }}
                >
                  {/* Header */}
                  <div
                    onClick={() => setExpanded(isExpanded ? null : interview.id)}
                    style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ fontSize: "32px" }}>🤖</div>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "6px" }}>
                          {interview.role}
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "12px", background: diffStyle.bg, color: diffStyle.color, border: `1px solid ${diffStyle.border}` }}>
                            {interview.difficulty}
                          </span>
                          <span style={{ color: "#888", fontSize: "12px" }}>
                            {new Date(interview.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                          <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "12px", background: interview.status === "completed" ? "#14532d" : "#1e3a5f", color: interview.status === "completed" ? "#86efac" : "#93c5fd" }}>
                            {interview.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      {interview.score !== null && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "24px", fontWeight: "bold", color: getScoreColor(interview.score) }}>
                            {interview.score}/10
                          </div>
                          <div style={{ color: "#888", fontSize: "11px" }}>Score</div>
                        </div>
                      )}
                      <div style={{ color: "#888", fontSize: "18px" }}>
                        {isExpanded ? "▲" : "▼"}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Questions */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #222", padding: "24px" }}>
                      <h3 style={{ fontWeight: "600", marginBottom: "16px", color: "#ccc" }}>
                        Questions & Answers
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {interview.questions?.map((q, index) => (
                          <div
                            key={q.id}
                            style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: "8px", padding: "16px" }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                              <div style={{ color: "#60a5fa", fontSize: "13px", fontWeight: "600" }}>
                                Question {index + 1}
                              </div>
                              {q.score !== null && (
                                <div style={{ color: getScoreColor(q.score), fontWeight: "bold", fontSize: "14px" }}>
                                  {q.score}/10
                                </div>
                              )}
                            </div>
                            <p style={{ color: "#f0f0f0", marginBottom: "12px", lineHeight: "1.6", fontSize: "14px" }}>
                              {q.content}
                            </p>
                            {q.answer && (
                              <div style={{ marginBottom: "12px" }}>
                                <div style={{ color: "#888", fontSize: "12px", marginBottom: "4px" }}>Your Answer:</div>
                                <p style={{ color: "#ccc", fontSize: "14px", lineHeight: "1.6", background: "#111", padding: "10px", borderRadius: "6px" }}>
                                  {q.answer}
                                </p>
                              </div>
                            )}
                            {q.feedback && (
                              <div>
                                <div style={{ color: "#888", fontSize: "12px", marginBottom: "4px" }}>Feedback:</div>
                                <p style={{ color: "#ccc", fontSize: "13px", lineHeight: "1.6", fontStyle: "italic" }}>
                                  {q.feedback}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}