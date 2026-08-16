import Link from "next/link"

const FEATURES = [
  { icon: "🤖", title: "AI Interviewer", desc: "Practice with questions tailored to your role and difficulty." },
  { icon: "📄", title: "Resume Upload", desc: "Get personalized questions based on your actual experience." },
  { icon: "📊", title: "Analytics", desc: "Track your scores and improvements across all sessions." },
  { icon: "💬", title: "Instant Feedback", desc: "Detailed feedback on every answer, with what a strong answer covered." },
  { icon: "🎯", title: "Role-Specific", desc: "Frontend, Backend, Full Stack — questions for your target role." },
  { icon: "📈", title: "Score Tracking", desc: "See your performance improve over time with detailed stats." },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-ink text-white">
      <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-line-2 px-4 py-4 sm:px-8">
        <div className="text-xl font-bold text-brand">InterviewAI</div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-body hover:text-white">
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-brand-strong px-4 py-2 font-semibold text-white hover:bg-brand-strong/90"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <section className="px-4 py-16 text-center sm:py-20">
        {/* Scales down on phones instead of overflowing at a fixed 48px. */}
        <h1 className="mb-6 text-3xl font-bold sm:text-4xl md:text-5xl">
          Ace Your Next <span className="text-brand">Technical Interview</span>
        </h1>
        <p className="mx-auto mb-10 max-w-lg text-base text-muted sm:text-lg">
          Practice with an AI interviewer, get real feedback on every answer, and
          see exactly what a strong answer needed.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="w-full max-w-xs rounded-lg bg-brand-strong px-8 py-3 font-semibold text-white hover:bg-brand-strong/90 sm:w-auto"
          >
            Start Free Practice
          </Link>
          <Link
            href="/login"
            className="w-full max-w-xs rounded-lg border border-line-2 px-8 py-3 text-white hover:bg-surface-2 sm:w-auto"
          >
            Sign In
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
        <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">
          Everything You Need
        </h2>
        {/* One column on phones, two on tablets, three on desktop. */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-line bg-surface p-6">
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-14 border-t border-line px-4 py-6 text-center text-sm text-muted">
        © {new Date().getFullYear()} InterviewAI. Built with Next.js and Groq.
      </footer>
    </main>
  )
}
