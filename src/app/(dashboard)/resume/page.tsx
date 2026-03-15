"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ResumePage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [existingResume, setExistingResume] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    fetch("/api/resume")
      .then((res) => res.json())
      .then((data) => {
        setExistingResume(data.resume)
        setLoading(false)
      })
  }, [])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError("")
    setSuccess(false)

    const formData = new FormData()
    formData.append("resume", file)

    const res = await fetch("/api/resume", {
      method: "POST",
      body: formData
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Upload failed")
    } else {
      setSuccess(true)
      setExistingResume({ filename: file.name, createdAt: new Date() })
    }

    setUploading(false)
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

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>Resume Upload</h1>
          <p style={{ color: "#888" }}>Upload your resume to get personalized interview questions</p>
        </div>

        {!loading && existingResume && (
          <div style={{ background: "#0f2a0f", border: "1px solid #22c55e", borderRadius: "12px", padding: "20px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#22c55e", fontWeight: "600", marginBottom: "4px" }}>✅ Resume Active</div>
              <div style={{ color: "#ccc", fontSize: "14px" }}>{existingResume.filename}</div>
              <div style={{ color: "#888", fontSize: "12px", marginTop: "4px" }}>
                Uploaded {new Date(existingResume.createdAt).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={() => router.push("/interview/new")}
              style={{ padding: "10px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
            >
              Start Interview
            </button>
          </div>
        )}

        <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "32px" }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const dropped = e.dataTransfer.files[0]
              if (dropped?.type === "application/pdf") {
                setFile(dropped)
                setError("")
              } else {
                setError("Only PDF files are allowed")
              }
            }}
            style={{
              border: `2px dashed ${dragOver ? "#2563eb" : file ? "#22c55e" : "#333"}`,
              borderRadius: "12px",
              padding: "48px 24px",
              textAlign: "center",
              marginBottom: "24px",
              transition: "border-color 0.2s",
              background: dragOver ? "#1e3a5f22" : "transparent",
              cursor: "pointer"
            }}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>
              {file ? "📄" : "📁"}
            </div>
            {file ? (
              <div>
                <div style={{ color: "#22c55e", fontWeight: "600", marginBottom: "4px" }}>{file.name}</div>
                <div style={{ color: "#888", fontSize: "14px" }}>{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: "600", marginBottom: "8px" }}>Drop your PDF here</div>
                <div style={{ color: "#888", fontSize: "14px" }}>or click to browse</div>
              </div>
            )}
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const selected = e.target.files?.[0]
                if (selected) {
                  setFile(selected)
                  setError("")
                  setSuccess(false)
                }
              }}
            />
          </div>

          {error && (
            <div style={{ background: "#2d1515", border: "1px solid #ef4444", color: "#ef4444", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ background: "#0f2a0f", border: "1px solid #22c55e", color: "#22c55e", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
              ✅ Resume uploaded! Your next interview will use it for personalized questions.
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              width: "100%",
              padding: "14px",
              background: !file || uploading ? "#1d4ed8" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: !file || uploading ? "not-allowed" : "pointer",
              opacity: !file ? 0.5 : 1
            }}
          >
            {uploading ? "Uploading & Parsing PDF..." : "Upload Resume"}
          </button>
        </div>

        <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "24px", marginTop: "24px" }}>
          <h3 style={{ fontWeight: "600", marginBottom: "16px" }}>How it works</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { icon: "📄", text: "Upload your resume as a PDF file" },
              { icon: "🤖", text: "AI parses and understands your experience" },
              { icon: "🎯", text: "Interview questions are tailored to your background" },
              { icon: "📈", text: "Get more relevant feedback for your specific skills" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "20px" }}>{item.icon}</span>
                <span style={{ color: "#ccc", fontSize: "14px" }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}