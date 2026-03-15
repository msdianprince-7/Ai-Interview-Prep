"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Interview {
  id: string
  role: string
  difficulty: string
  status: string
  score: number | null
  createdAt: string
  questions: { score: number | null }[]
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/interviews")
      .then((res) => res.json())
      .then((data) => {
        setInterviews(data.interviews || [])
        setLoading(false)
      })
  }, [])

  const completed = interviews.filter((i) => i.status === "completed")
  const avgScore = completed.length
    ? Math.round(completed.reduce((a, b) => a + (b.score || 0), 0) / completed.length)
    : 0
  const bestScore = completed.length
    ? Math.max(...completed.map((i) => i.score || 0))
    : 0
  const totalQuestions = interviews.reduce((a, b) => a + b.questions.length, 0)

  // Score over time data
  const scoreHistory = completed.slice(-7).map((i) => ({
    date: new Date(i.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: i.score || 0,
    role: i.role
  }))

  // Role breakdown
  const roleMap: Record<string, number[]> = {}
  completed.forEach((i) => {
    if (!roleMap[i.role]) roleMap[i.role] = []
    roleMap[i.role].push(i.score || 0)
  })
  const roleStats = Object.entries(roleMap).map(([role, scores]) => ({
    role,
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    count: scores.length
  }))

  // Difficulty breakdown
  const diffMap: Record<string, number[]> = {}
  completed.forEach((i) => {
    if (!diffMap[i.difficulty]) diffMap[i.difficulty] = []
    diffMap[i.difficulty].push(i.score || 0)
  })
  const diffStats = Object.entries(diffMap).map(([diff, scores]) => ({
    diff,
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    count: scores.length
  }))

  const getScoreColor = (score: number) => {
    if (score >= 8) return "#22c55e"
    if (score >= 6) return "#60a5fa"
    if (score >= 4) return "#f59e0b"
    return "#ef4444"
  }

  const maxScore = Math.max(...scoreHistory.map((s) => s.score), 1)

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial" }}>
        <p style={{ color: "#888" }}>Loading analytics...</p>
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

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>Analytics</h1>
          <p style={{ color: "#888" }}>Track your interview performance over time</p>
        </div>

        {interviews.length === 0 ? (
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "60px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
            <p style={{ color: "#888", marginBottom: "16px" }}>No data yet. Complete some interviews first!</p>
            <button
              onClick={() => router.push("/interview/new")}
              style={{ padding: "10px 24px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
            >
              Start Interview
            </button>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
              {[
                { label: "Total Interviews", value: interviews.length, icon: "🎯", color: "#60a5fa" },
                { label: "Completed", value: completed.length, icon: "✅", color: "#22c55e" },
                { label: "Average Score", value: avgScore ? `${avgScore}/10` : "N/A", icon: "📊", color: getScoreColor(avgScore) },
                { label: "Best Score", value: bestScore ? `${bestScore}/10` : "N/A", icon: "🏆", color: "#f59e0b" },
              ].map((stat) => (
                <div key={stat.label} style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "20px" }}>
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>{stat.icon}</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: stat.color, marginBottom: "4px" }}>{stat.value}</div>
                  <div style={{ color: "#888", fontSize: "13px" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Score Over Time Chart */}
            {scoreHistory.length > 0 && (
              <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
                <h2 style={{ fontWeight: "600", marginBottom: "24px", fontSize: "18px" }}>Score History</h2>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", height: "160px", paddingBottom: "32px", position: "relative" }}>
                  {/* Y axis labels */}
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", paddingBottom: "0" }}>
                    {[10, 5, 0].map((v) => (
                      <div key={v} style={{ color: "#888", fontSize: "11px", width: "20px" }}>{v}</div>
                    ))}
                  </div>
                  {/* Bars */}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", flex: 1, height: "100%" }}>
                    {scoreHistory.map((s, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end" }}>
                        <div style={{ color: getScoreColor(s.score), fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                          {s.score}
                        </div>
                        <div
                          style={{
                            width: "100%",
                            height: `${(s.score / 10) * 100}%`,
                            background: getScoreColor(s.score),
                            borderRadius: "4px 4px 0 0",
                            opacity: 0.8,
                            minHeight: "4px",
                            transition: "height 0.3s"
                          }}
                        />
                        <div style={{ color: "#888", fontSize: "11px", marginTop: "8px", textAlign: "center" }}>{s.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px", marginBottom: "24px" }}>
              {/* Role Breakdown */}
              <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "24px" }}>
                <h2 style={{ fontWeight: "600", marginBottom: "20px", fontSize: "18px" }}>By Role</h2>
                {roleStats.length === 0 ? (
                  <p style={{ color: "#888", fontSize: "14px" }}>No data yet</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {roleStats.map((r) => (
                      <div key={r.role}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ fontSize: "13px", color: "#ccc" }}>{r.role}</span>
                          <span style={{ fontSize: "13px", color: getScoreColor(r.avg), fontWeight: "600" }}>{r.avg}/10</span>
                        </div>
                        <div style={{ background: "#222", borderRadius: "4px", height: "6px" }}>
                          <div style={{ background: getScoreColor(r.avg), height: "100%", borderRadius: "4px", width: `${(r.avg / 10) * 100}%` }} />
                        </div>
                        <div style={{ color: "#888", fontSize: "11px", marginTop: "4px" }}>{r.count} interview{r.count > 1 ? "s" : ""}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Difficulty Breakdown */}
              <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "24px" }}>
                <h2 style={{ fontWeight: "600", marginBottom: "20px", fontSize: "18px" }}>By Difficulty</h2>
                {diffStats.length === 0 ? (
                  <p style={{ color: "#888", fontSize: "14px" }}>No data yet</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {diffStats.map((d) => {
                      const diffColor = d.diff === "Easy" ? "#22c55e" : d.diff === "Medium" ? "#60a5fa" : "#ef4444"
                      return (
                        <div key={d.diff}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "13px", color: "#ccc" }}>{d.diff}</span>
                            <span style={{ fontSize: "13px", color: diffColor, fontWeight: "600" }}>{d.avg}/10</span>
                          </div>
                          <div style={{ background: "#222", borderRadius: "4px", height: "6px" }}>
                            <div style={{ background: diffColor, height: "100%", borderRadius: "4px", width: `${(d.avg / 10) * 100}%` }} />
                          </div>
                          <div style={{ color: "#888", fontSize: "11px", marginTop: "4px" }}>{d.count} interview{d.count > 1 ? "s" : ""}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Total Questions Answered */}
            <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontWeight: "600", fontSize: "18px", marginBottom: "4px" }}>Total Questions Answered</h2>
                <p style={{ color: "#888", fontSize: "14px" }}>Keep practicing to improve your scores</p>
              </div>
              <div style={{ fontSize: "48px", fontWeight: "bold", color: "#60a5fa" }}>{totalQuestions}</div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}