"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Alert, Button, Card, Page } from "@/components/ui/shell"

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

const difficulties = ["Easy", "Medium", "Hard"] as const

const difficultyClasses: Record<string, string> = {
  Easy: "border-good bg-good-deep text-good-fg",
  Medium: "border-brand-strong bg-brand-deep text-brand",
  Hard: "border-bad bg-bad-bg text-bad-fg",
}

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
        body: JSON.stringify({ role, difficulty, useResume }),
      })

      const data = await res.json().catch(() => ({}))

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
    <Page center>
      <div className="w-full max-w-xl px-4 py-10">
        <div className="mb-8 text-center">
          <Link href="/dashboard" className="text-sm text-muted hover:text-white">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-4 mb-2 text-2xl font-bold sm:text-3xl">Start New Interview</h1>
          <p className="text-muted">Choose your role and difficulty to begin</p>
        </div>

        <Card>
          {error && <Alert>{error}</Alert>}

          {resumeFilename ? (
            <button
              type="button"
              role="switch"
              aria-checked={useResume}
              onClick={() => setUseResume((prev) => !prev)}
              className={`mb-6 flex w-full cursor-pointer items-center gap-3 rounded-lg border p-4 text-left ${
                useResume ? "border-good bg-good-bg" : "border-line-2 bg-surface-2"
              }`}
            >
              <span className="text-xl">📄</span>
              <span className="flex-1">
                <span className={`block text-sm font-semibold ${useResume ? "text-good-fg" : "text-body"}`}>
                  {useResume ? "Personalized from your resume" : "Resume turned off"}
                </span>
                <span className="mt-0.5 block text-xs break-words text-muted">
                  {useResume
                    ? `Questions will reference ${resumeFilename}`
                    : "Using general questions for this role"}
                </span>
              </span>
              <span
                className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
                  useResume ? "bg-good" : "bg-line-2"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                    useResume ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
          ) : (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line-2 bg-surface-2 p-4">
              <div>
                <div className="text-sm font-semibold text-body">Using general questions</div>
                <div className="mt-0.5 text-xs text-muted">
                  Upload a resume to get questions about your own experience
                </div>
              </div>
              <Button variant="ghost" onClick={() => router.push("/resume")}>
                Upload
              </Button>
            </div>
          )}

          <div className="mb-7">
            <label className="mb-3 block font-semibold">Select Role</label>
            {/* Single column on phones so role names never truncate. */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`cursor-pointer rounded-lg border p-3 text-left text-[13px] transition-colors ${
                    role === r
                      ? "border-brand-strong bg-brand-deep text-brand"
                      : "border-line-2 bg-surface-2 text-body hover:bg-line"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="mb-3 block font-semibold">Select Difficulty</label>
            <div className="grid grid-cols-3 gap-2.5">
              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`cursor-pointer rounded-lg border p-3 text-sm font-semibold transition-colors ${
                    difficulty === d
                      ? difficultyClasses[d]
                      : "border-line-2 bg-surface-2 text-body hover:bg-line"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <Button full onClick={handleStart} disabled={loading}>
            {loading ? "Starting Interview..." : "🤖 Start Interview"}
          </Button>
        </Card>
      </div>
    </Page>
  )
}
