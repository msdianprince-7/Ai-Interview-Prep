"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
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

interface Interview {
  id: string
  role: string
  difficulty: string
  status: string
  score: number | null
  createdAt: string
}

const ACTIONS = [
  { href: "/interview/new", icon: "🤖", title: "Start New Interview", desc: "Practice with AI interviewer", primary: true },
  { href: "/resume", icon: "📄", title: "Upload Resume", desc: "Get personalized questions" },
  { href: "/history", icon: "📋", title: "Interview History", desc: "Review past sessions" },
  { href: "/analytics", icon: "📈", title: "Analytics", desc: "Track your progress" },
]

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [interviews, setInterviews] = useState<Interview[]>([])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/interviews")
        .then((res) => res.json())
        .then((data) => setInterviews(data.interviews || []))
        .catch(() => setInterviews([]))
    }
  }, [status])

  if (status === "loading") return <Spinner label="Loading..." />
  if (status === "unauthenticated") return null

  const scored = interviews.filter((i) => i.score !== null)
  const avg = scored.length
    ? Math.round(scored.reduce((a, b) => a + (b.score ?? 0), 0) / scored.length)
    : null

  const stats = [
    { label: "Total Interviews", value: interviews.length, icon: "🎯" },
    { label: "Completed", value: interviews.filter((i) => i.status === "completed").length, icon: "✅" },
    { label: "Avg Score", value: avg !== null ? `${avg}/10` : "N/A", icon: "📊" },
  ]

  return (
    <Page>
      <TopBar>
        <span className="text-sm text-muted">Hi, {session?.user?.name}</span>
        <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/" })}>
          Sign Out
        </Button>
      </TopBar>

      <Container size="xl">
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
            Welcome back, {session?.user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted">Ready to practice your next interview?</p>
        </div>

        {/* Stacked on phones, three across from small screens up. */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <div className="mb-2 text-2xl">{s.icon}</div>
              <div className="mb-1 text-2xl font-bold">{s.value}</div>
              <div className="text-sm text-muted">{s.label}</div>
            </Card>
          ))}
        </div>

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ACTIONS.map((a) => (
            <button
              key={a.href}
              onClick={() => router.push(a.href)}
              className={`cursor-pointer rounded-xl border p-6 text-left transition-colors ${
                a.primary
                  ? "border-brand-strong bg-brand-deep hover:bg-brand-deep/80"
                  : "border-line-2 bg-surface hover:bg-surface-2"
              }`}
            >
              <div className="mb-3 text-3xl">{a.icon}</div>
              <div className="mb-1 text-lg font-semibold">{a.title}</div>
              <div className={`text-sm ${a.primary ? "text-brand" : "text-muted"}`}>
                {a.desc}
              </div>
            </button>
          ))}
        </div>

        <h2 className="mb-4 text-xl font-semibold">Recent Interviews</h2>
        {interviews.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="No interviews yet. Start your first one!"
            action={<Button onClick={() => router.push("/interview/new")}>Start Interview</Button>}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {interviews.slice(0, 5).map((interview) => (
              <button
                key={interview.id}
                onClick={() => router.push(`/interview/${interview.id}`)}
                className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-5 text-left hover:bg-surface-2"
              >
                <div>
                  <div className="mb-1 font-semibold">{interview.role}</div>
                  <div className="text-sm text-muted">
                    {interview.difficulty} • {new Date(interview.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {interview.score !== null && (
                    <span className="font-bold text-brand">{interview.score}/10</span>
                  )}
                  <Badge tone={interview.status === "completed" ? "good" : "brand"}>
                    {interview.status}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </Container>
    </Page>
  )
}
