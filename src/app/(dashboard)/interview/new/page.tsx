"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const roles = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Mobile Developer",
  "Software Engineer",
]

const difficulties = ["Easy", "Medium", "Hard"]

export default function NewInterviewPage() {
  const router = useRouter()
  const [role, setRole] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resumeFilename, setResumeFilename] = useState<string | null>(null)
  const [useResume, setUseResume] = useState(true)

  // Questions are generated from the stored resume when one exists, so the
  // page reports which mode the interview will run in.
  useEffect(() => {
    fetch("/api/resume")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setResumeFilename(data?.resume?.filename ?? null))
      .catch(() => setResumeFilename(null))
  }, [])

  const handleStart = async () => {
  if (!role || !difficulty) {
    setError("Please select both role and difficulty")
    return
  }

  setLoading(true)
  setError("")

  try {
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Only meaningful when a resume exists; the server ignores it otherwise.
      body: JSON.stringify({ role, difficulty, useResume })
    })

    const text = await res.text()
    
    if (!text) {
      setError("Server returned empty response")
      setLoading(false)
      return
    }

    const data = JSON.parse(text)

    if (!res.ok) {
      setError(data.error || "Failed to start interview")
      setLoading(false)
      return
    }

    router.push(`/interview/${data.interviewId}`)
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Something went wrong")
    setLoading(false)
  }
}

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", fontFamily: "Arial", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "600px", padding: "0 16px" }}>

        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <a href="/dashboard" style={{ color: "#888", textDecoration: "none", fontSize: "14px" }}>
            ← Back to Dashboard
          </a>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", marginTop: "16px", marginBottom: "8px" }}>
            Start New Interview
          </h1>
          <p style={{ color: "#888" }}>Choose your role and difficulty to begin</p>
        </div>

        <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "32px" }}>
          {error && (
            <div style={{ background: "#2d1515", border: "1px solid #ef4444", color: "#ef4444", padding: "12px", borderRadius: "8px", marginBottom: "24px", fontSize: "14px" }}>
              {error}
            </div>
          )}

          {/* Resume status */}
          {resumeFilename ? (
            <button
              type="button"
              role="switch"
              aria-checked={useResume}
              onClick={() => setUseResume((prev) => !prev)}
              style={{
                width: "100%",
                textAlign: "left",
                background: useResume ? "#0f2a0f" : "#1a1a2e",
                border: `1px solid ${useResume ? "#22c55e" : "#333"}`,
                borderRadius: "8px",
                padding: "14px 16px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                color: "white",
              }}
            >
              <div style={{ fontSize: "20px" }}>📄</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: useResume ? "#86efac" : "#ccc", fontSize: "14px", fontWeight: "600" }}>
                  {useResume ? "Personalized from your resume" : "Resume turned off"}
                </div>
                <div style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>
                  {useResume
                    ? `Questions will reference ${resumeFilename}`
                    : "Using general questions for this role"}
                </div>
              </div>
              {/* Switch track */}
              <div
                style={{
                  width: "40px",
                  height: "22px",
                  borderRadius: "11px",
                  background: useResume ? "#22c55e" : "#333",
                  padding: "2px",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "white",
                    transform: useResume ? "translateX(18px)" : "translateX(0)",
                    transition: "transform 0.2s",
                  }}
                />
              </div>
            </button>
          ) : (
            <div style={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: "8px", padding: "14px 16px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <div style={{ color: "#ccc", fontSize: "14px", fontWeight: "600" }}>
                  Using general questions
                </div>
                <div style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>
                  Upload a resume to get questions about your own experience
                </div>
              </div>
              <button
                onClick={() => router.push("/resume")}
                style={{ padding: "8px 14px", background: "transparent", border: "1px solid #333", color: "#60a5fa", borderRadius: "6px", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}
              >
                Upload
              </button>
            </div>
          )}

          {/* Role Selection */}
          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", marginBottom: "12px", fontWeight: "600" }}>
              Select Role
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    padding: "12px",
                    background: role === r ? "#1e3a5f" : "#1a1a1a",
                    border: role === r ? "1px solid #2563eb" : "1px solid #333",
                    borderRadius: "8px",
                    color: role === r ? "#93c5fd" : "#ccc",
                    cursor: "pointer",
                    fontSize: "13px",
                    textAlign: "left"
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Selection */}
          <div style={{ marginBottom: "32px" }}>
            <label style={{ display: "block", marginBottom: "12px", fontWeight: "600" }}>
              Select Difficulty
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  style={{
                    padding: "12px",
                    background: difficulty === d ? (d === "Easy" ? "#14532d" : d === "Medium" ? "#1e3a5f" : "#2d1515") : "#1a1a1a",
                    border: difficulty === d ? `1px solid ${d === "Easy" ? "#22c55e" : d === "Medium" ? "#2563eb" : "#ef4444"}` : "1px solid #333",
                    borderRadius: "8px",
                    color: difficulty === d ? (d === "Easy" ? "#86efac" : d === "Medium" ? "#93c5fd" : "#fca5a5") : "#ccc",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading ? "#1d4ed8" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Starting Interview..." : "🤖 Start Interview"}
          </button>
        </div>
      </div>
    </main>
  )
}