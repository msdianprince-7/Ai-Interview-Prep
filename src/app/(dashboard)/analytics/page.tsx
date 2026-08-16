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
  questions: { score: number | null }[]
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

  useEffect(() => {
    fetch("/api/interviews")
      .then((res) => res.json())
      .then((data) => {
        setInterviews(data.interviews || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const completed = interviews.filter((i) => i.status === "completed")
  const avgScore = completed.length
    ? Math.round(completed.reduce((a, b) => a + (b.score || 0), 0) / completed.length)
    : 0
  const bestScore = completed.length ? Math.max(...completed.map((i) => i.score || 0)) : 0
  const totalQuestions = interviews.reduce((a, b) => a + b.questions.length, 0)

  const scoreHistory = completed.slice(-7).map((i) => ({
    date: new Date(i.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: i.score || 0,
  }))

  const groupAverages = (key: "role" | "difficulty") => {
    const map: Record<string, number[]> = {}
    completed.forEach((i) => {
      const k = i[key]
      if (!map[k]) map[k] = []
      map[k].push(i.score || 0)
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
    { label: "Average Score", value: avgScore ? `${avgScore}/10` : "N/A", icon: "📊", tone: scoreColor(avgScore) },
    { label: "Best Score", value: bestScore ? `${bestScore}/10` : "N/A", icon: "🏆", tone: "text-warn" },
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

        {interviews.length === 0 ? (
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
