"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
interface Interview {
  id: string
  role: string
  difficulty: string
  status: string
  score: number | null
  createdAt: string
}

const [interviews, setInterviews] = useState<Interview[]>([])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/interviews")
        .then((res) => res.json())
        .then((data) => setInterviews(data.interviews || []))
    }
  }, [status])

  if (status === "loading") {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial" }}>
        <p style={{ color: "#888" }}>Loading...</p>
      </main>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", fontFamily: "Arial" }}>

      {/* Navbar */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", borderBottom: "1px solid #222" }}>
        <div style={{ color: "#60a5fa", fontSize: "20px", fontWeight: "bold" }}>InterviewAI</div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#888", fontSize: "14px" }}>Hi, {session?.user?.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{ padding: "8px 16px", background: "transparent", border: "1px solid #333", color: "#ccc", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 32px" }}>

        {/* Welcome */}
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>
            Welcome back, {session?.user?.name?.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "#888" }}>Ready to practice your next interview?</p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "40px" }}>
          {[
            { label: "Total Interviews", value: interviews.length, icon: "🎯" },
            { label: "Completed", value: interviews.filter((i) => i.status === "completed").length, icon: "✅" },
            { label: "Avg Score", value: interviews.length ? Math.round(interviews.filter(i => i.score).reduce((a, b) => a + b.score, 0) / (interviews.filter(i => i.score).length || 1)) + "/10" : "N/A", icon: "📊" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "24px" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>{stat.icon}</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "4px" }}>{stat.value}</div>
              <div style={{ color: "#888", fontSize: "14px" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "40px" }}>
          <button
            onClick={() => router.push("/interview/new")}
            style={{ padding: "24px", background: "#1e3a5f", border: "1px solid #2563eb", borderRadius: "12px", color: "white", cursor: "pointer", textAlign: "left" }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🤖</div>
            <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>Start New Interview</div>
            <div style={{ color: "#93c5fd", fontSize: "14px" }}>Practice with AI interviewer</div>
          </button>

          <button
            onClick={() => router.push("/resume")}
            style={{ padding: "24px", background: "#1a1a2e", border: "1px solid #333", borderRadius: "12px", color: "white", cursor: "pointer", textAlign: "left" }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📄</div>
            <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>Upload Resume</div>
            <div style={{ color: "#888", fontSize: "14px" }}>Get personalized questions</div>
          </button>

          <button
            onClick={() => router.push("/history")}
            style={{ padding: "24px", background: "#1a1a2e", border: "1px solid #333", borderRadius: "12px", color: "white", cursor: "pointer", textAlign: "left" }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📋</div>
            <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>Interview History</div>
            <div style={{ color: "#888", fontSize: "14px" }}>Review past sessions</div>
          </button>

          <button
            onClick={() => router.push("/analytics")}
            style={{ padding: "24px", background: "#1a1a2e", border: "1px solid #333", borderRadius: "12px", color: "white", cursor: "pointer", textAlign: "left" }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📈</div>
            <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>Analytics</div>
            <div style={{ color: "#888", fontSize: "14px" }}>Track your progress</div>
          </button>
        </div>

        {/* Recent Interviews */}
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>Recent Interviews</h2>
          {interviews.length === 0 ? (
            <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎯</div>
              <p style={{ color: "#888", marginBottom: "16px" }}>No interviews yet. Start your first one!</p>
              <button
                onClick={() => router.push("/interview/new")}
                style={{ padding: "10px 24px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
              >
                Start Interview
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {interviews.slice(0, 5).map((interview) => (
                <div
                  key={interview.id}
                  onClick={() => router.push(`/interview/${interview.id}`)}
                  style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                >
                  <div>
                    <div style={{ fontWeight: "600", marginBottom: "4px" }}>{interview.role}</div>
                    <div style={{ color: "#888", fontSize: "14px" }}>{interview.difficulty} • {new Date(interview.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {interview.score && (
                      <div style={{ color: "#60a5fa", fontWeight: "bold" }}>{interview.score}/10</div>
                    )}
                    <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", background: interview.status === "completed" ? "#14532d" : "#1e3a5f", color: interview.status === "completed" ? "#86efac" : "#93c5fd" }}>
                      {interview.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}