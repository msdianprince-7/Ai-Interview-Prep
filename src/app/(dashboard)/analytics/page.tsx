"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Button,
  Card,
  Container,
  EmptyState,
  Page,
  Spinner,
  TopBar,
} from "@/components/ui/shell"

interface Interview {
  id: string
  role: string
  difficulty: string
  status: string
  score: number | null
  createdAt: string
  questions: { score: number | null; answer: string | null }[]
}

function scoreColor(score: number) {
  if (score >= 8) return "text-good"
  if (score >= 6) return "text-brand"
  if (score >= 4) return "text-warn"
  return "text-bad"
}

function scoreBar(score: number) {
  if (score >= 8) return "bg-good"
  if (score >= 6) return "bg-brand"
  if (score >= 4) return "bg-warn"
  return "bg-bad"
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/interviews")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login")
          return
        }
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to load interviews")
        setInterviews(Array.isArray(data.interviews) ? data.interviews : [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load interviews"))
      .finally(() => setLoading(false))
  }, [router])

  const completed = interviews.filter((i) => i.status === "completed")
  // Only interviews that actually received a score count towards averages;
  // treating a missing score as 0 dragged every average down.
  const scored = completed.filter((i): i is Interview & { score: number } => i.score !== null)
  const avgScore = scored.length
    ? Math.round(scored.reduce((a, b) => a + b.score, 0) / scored.length)
    : null
  const bestScore = scored.length ? Math.max(...scored.map((i) => i.score)) : null
  // Count answered questions only — the card is "Questions Answered".
  const totalQuestions = interviews.reduce(
    (a, b) => a + (b.questions ?? []).filter((q) => q.answer !== null && q.answer !== "").length,
    0
  )

  // The API returns newest first. Take the 7 most recent scored interviews
  // and show them oldest → newest so the chart reads left-to-right in time.
  const scoreHistory = scored.slice(0, 7).reverse().map((i) => ({
    date: new Date(i.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: i.score,
  }))

  const groupAverages = (key: "role" | "difficulty") => {
    const map: Record<string, number[]> = {}
    scored.forEach((i) => {
      const k = i[key]
      if (!map[k]) map[k] = []
      map[k].push(i.score)
    })
    return Object.entries(map).map(([label, scores]) => ({
      label,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }))
  }

  const roleStats = groupAverages("role")
  const diffStats = groupAverages("difficulty")

  if (loading) return <Spinner label="Loading analytics..." />

  const stats = [
    { label: "Total Interviews", value: interviews.length, icon: "🎯", tone: "text-brand" },
    { label: "Completed", value: completed.length, icon: "✅", tone: "text-good" },
    { label: "Average Score", value: avgScore !== null ? `${avgScore}/10` : "N/A", icon: "📊", tone: avgScore !== null ? scoreColor(avgScore) : "text-muted" },
    { label: "Best Score", value: bestScore !== null ? `${bestScore}/10` : "N/A", icon: "🏆", tone: "text-warn" },
  ]

  return (
    <Page>
      <TopBar>
        <Button variant="ghost" onClick={() => router.push("/dashboard")}>
          ← Dashboard
        </Button>
      </TopBar>

      <Container>
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Analytics</h1>
          <p className="text-muted">Track your interview performance over time</p>
        </div>

        {error ? (
          <EmptyState
            icon="⚠️"
            title={error}
            action={<Button onClick={() => window.location.reload()}>Retry</Button>}
          />
        ) : interviews.length === 0 ? (
          <EmptyState
            icon="📊"
            title="No data yet. Complete some interviews first!"
            action={<Button onClick={() => router.push("/interview/new")}>Start Interview</Button>}
          />
        ) : (
          <>
            {/* Two across on phones rather than four squeezed columns. */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((s) => (
                <Card key={s.label}>
                  <div className="mb-2 text-2xl">{s.icon}</div>
                  <div className={`mb-1 text-xl font-bold sm:text-2xl ${s.tone}`}>{s.value}</div>
                  <div className="text-xs text-muted sm:text-sm">{s.label}</div>
                </Card>
              ))}
            </div>

            {scoreHistory.length > 0 && (
              <Card className="mb-6">
                <h2 className="mb-6 text-lg font-semibold">Score History</h2>
                <div className="flex h-44 items-end gap-2 sm:gap-3">
                  <div className="flex h-full flex-col justify-between pb-8 text-[11px] text-muted">
                    <span>10</span>
                    <span>5</span>
                    <span>0</span>
                  </div>
                  {scoreHistory.map((s, i) => (
                    <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
                      <div className={`mb-1 text-xs font-semibold ${scoreColor(s.score)}`}>
                        {s.score}
                      </div>
                      <div
                        className={`w-full rounded-t ${scoreBar(s.score)} opacity-80`}
                        style={{ height: `${(s.score / 10) * 100}%`, minHeight: "4px" }}
                      />
                      {/* Dates rotate on narrow screens so they never collide. */}
                      <div className="mt-2 h-6 origin-top -rotate-45 text-[10px] text-muted sm:rotate-0 sm:text-[11px]">
                        {s.date}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {[
                { title: "By Role", rows: roleStats },
                { title: "By Difficulty", rows: diffStats },
              ].map((section) => (
                <Card key={section.title}>
                  <h2 className="mb-5 text-lg font-semibold">{section.title}</h2>
                  {section.rows.length === 0 ? (
                    <p className="text-sm text-muted">No data yet</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {section.rows.map((r) => (
                        <div key={r.label}>
                          <div className="mb-1.5 flex justify-between gap-3">
                            <span className="text-sm text-body">{r.label}</span>
                            <span className={`text-sm font-semibold ${scoreColor(r.avg)}`}>
                              {r.avg}/10
                            </span>
                          </div>
                          <div className="h-1.5 rounded bg-line">
                            <div
                              className={`h-full rounded ${scoreBar(r.avg)}`}
                              style={{ width: `${(r.avg / 10) * 100}%` }}
                            />
                          </div>
                          <div className="mt-1 text-[11px] text-muted">
                            {r.count} interview{r.count > 1 ? "s" : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <Card className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="mb-1 text-lg font-semibold">Total Questions Answered</h2>
                <p className="text-sm text-muted">Keep practicing to improve your scores</p>
              </div>
              <div className="text-4xl font-bold text-brand">{totalQuestions}</div>
            </Card>
          </>
        )}
      </Container>
    </Page>
  )
}
