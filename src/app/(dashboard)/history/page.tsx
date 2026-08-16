"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Badge,
  Button,
  Card,
  Container,
  EmptyState,
  Page,
  Spinner,
  TopBar,
} from "@/components/ui/shell"

interface Question {
  id: string
  content: string
  answer: string | null
  score: number | null
  feedback: string | null
  order: number
  isFollowUp?: boolean
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

function scoreColor(score: number) {
  if (score >= 8) return "text-good"
  if (score >= 6) return "text-brand"
  if (score >= 4) return "text-warn"
  return "text-bad"
}

function difficultyTone(difficulty: string) {
  if (difficulty === "Easy") return "good" as const
  if (difficulty === "Medium") return "brand" as const
  return "bad" as const
}

export default function HistoryPage() {
  const router = useRouter()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/interviews")
      .then((res) => res.json())
      .then((data) => {
        setInterviews(data.interviews || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <Spinner label="Loading history..." />

  return (
    <Page>
      <TopBar>
        <Button variant="ghost" onClick={() => router.push("/dashboard")}>
          ← Dashboard
        </Button>
      </TopBar>

      <Container>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Interview History</h1>
            <p className="text-muted">{interviews.length} total interviews</p>
          </div>
          <Button onClick={() => router.push("/interview/new")}>+ New Interview</Button>
        </div>

        {interviews.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No interviews yet"
            action={
              <Button onClick={() => router.push("/interview/new")}>
                Start First Interview
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {interviews.map((interview) => {
              const isExpanded = expanded === interview.id

              return (
                <div
                  key={interview.id}
                  className="overflow-hidden rounded-xl border border-line bg-surface"
                >
                  <button
                    onClick={() => setExpanded(isExpanded ? null : interview.id)}
                    aria-expanded={isExpanded}
                    className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-4 p-5 text-left hover:bg-surface-2"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">🤖</div>
                      <div>
                        <div className="mb-1.5 font-semibold">{interview.role}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={difficultyTone(interview.difficulty)}>
                            {interview.difficulty}
                          </Badge>
                          <span className="text-xs text-muted">
                            {new Date(interview.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <Badge tone={interview.status === "completed" ? "good" : "brand"}>
                            {interview.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {interview.score !== null && (
                        <div className="text-center">
                          <div className={`text-xl font-bold ${scoreColor(interview.score)}`}>
                            {interview.score}/10
                          </div>
                          <div className="text-[11px] text-muted">Score</div>
                        </div>
                      )}
                      <span className="text-muted">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-line p-5">
                      <h3 className="mb-4 font-semibold text-body">Questions &amp; Answers</h3>
                      <div className="flex flex-col gap-4">
                        {interview.questions?.map((q, index) => (
                          <Card key={q.id} className="bg-ink">
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[13px] font-semibold text-brand">
                                  Question {index + 1}
                                </span>
                                {q.isFollowUp && <Badge tone="warn">↳ Follow-up</Badge>}
                              </div>
                              {q.score !== null && (
                                <span className={`text-sm font-bold ${scoreColor(q.score)}`}>
                                  {q.score}/10
                                </span>
                              )}
                            </div>

                            {/* break-words stops long unbroken answers overflowing on phones. */}
                            <p className="mb-3 text-sm leading-relaxed break-words text-white/90">
                              {q.content}
                            </p>

                            {q.answer && (
                              <div className="mb-3">
                                <div className="mb-1 text-xs text-muted">Your Answer:</div>
                                <p className="rounded-md bg-surface p-3 text-sm leading-relaxed break-words text-body">
                                  {q.answer}
                                </p>
                              </div>
                            )}

                            {q.feedback && (
                              <div>
                                <div className="mb-1 text-xs text-muted">Feedback:</div>
                                <p className="text-[13px] leading-relaxed break-words text-body italic">
                                  {q.feedback}
                                </p>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </Page>
  )
}
