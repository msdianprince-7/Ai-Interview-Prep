"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Alert, Button, Card, Container, Page, TopBar } from "@/components/ui/shell"

interface StoredResume {
  id: string
  filename: string
  createdAt: string | Date
}

const STEPS = [
  { icon: "📄", text: "Upload your resume as a PDF file" },
  { icon: "🤖", text: "The text is extracted and used as reference material" },
  { icon: "🎯", text: "Interview questions are tailored to your background" },
  { icon: "📈", text: "Get more relevant feedback for your specific skills" },
]

export default function ResumePage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [existingResume, setExistingResume] = useState<StoredResume | null>(null)
  const [loading, setLoading] = useState(true)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    fetch("/api/resume")
      .then((res) => res.json())
      .then((data) => {
        setExistingResume(data.resume)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError("")
    setSuccess(false)

    const formData = new FormData()
    formData.append("resume", file)

    const res = await fetch("/api/resume", { method: "POST", body: formData })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(data.error || "Upload failed")
    } else {
      setSuccess(true)
      // Use the server's values: it sanitises the filename before storing it.
      setExistingResume({
        id: data.resumeId,
        filename: data.filename,
        createdAt: new Date().toISOString(),
      })
    }

    setUploading(false)
  }

  return (
    <Page>
      <TopBar>
        <Button variant="ghost" onClick={() => router.push("/dashboard")}>
          ← Dashboard
        </Button>
      </TopBar>

      <Container size="md">
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Resume Upload</h1>
          <p className="text-muted">
            Upload your resume to get personalized interview questions
          </p>
        </div>

        {!loading && existingResume && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-good bg-good-bg p-5">
            <div className="min-w-0">
              <div className="mb-1 font-semibold text-good">✅ Resume Active</div>
              <div className="text-sm break-words text-body">{existingResume.filename}</div>
              <div className="mt-1 text-xs text-muted">
                Uploaded {new Date(existingResume.createdAt).toLocaleDateString()}
              </div>
            </div>
            <Button onClick={() => router.push("/interview/new")}>Start Interview</Button>
          </div>
        )}

        <Card>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
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
            onClick={() => document.getElementById("file-input")?.click()}
            className={`mb-6 cursor-pointer rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
              dragOver
                ? "border-brand-strong bg-brand-deep/20"
                : file
                  ? "border-good"
                  : "border-line-2"
            }`}
          >
            <div className="mb-4 text-5xl">{file ? "📄" : "📁"}</div>
            {file ? (
              <div>
                <div className="mb-1 font-semibold break-words text-good">{file.name}</div>
                <div className="text-sm text-muted">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div>
                <div className="mb-2 font-semibold">Drop your PDF here</div>
                <div className="text-sm text-muted">or click to browse</div>
              </div>
            )}
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              className="hidden"
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

          {error && <Alert>{error}</Alert>}
          {success && (
            <Alert tone="good">
              ✅ Resume uploaded! Your next interview will use it for personalized questions.
            </Alert>
          )}

          <Button full onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? "Uploading & Parsing PDF..." : "Upload Resume"}
          </Button>
        </Card>

        <Card className="mt-6">
          <h3 className="mb-4 font-semibold">How it works</h3>
          <div className="flex flex-col gap-3">
            {STEPS.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm text-body">{item.text}</span>
              </div>
            ))}
          </div>
        </Card>
      </Container>
    </Page>
  )
}
