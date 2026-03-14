export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", fontFamily: "Arial" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", padding: "16px 32px", borderBottom: "1px solid #333" }}>
        <div style={{ color: "#60a5fa", fontSize: "20px", fontWeight: "bold" }}>InterviewAI</div>
        <div style={{ display: "flex", gap: "16px" }}>
          <a href="/login" style={{ color: "#ccc", textDecoration: "none", padding: "8px 16px" }}>Login</a>
          <a href="/register" style={{ background: "#2563eb", color: "white", textDecoration: "none", padding: "8px 16px", borderRadius: "8px" }}>Get Started</a>
        </div>
      </nav>

      <section style={{ textAlign: "center", padding: "80px 16px" }}>
        <h1 style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "24px" }}>
          Ace Your Next <span style={{ color: "#60a5fa" }}>Technical Interview</span>
        </h1>
        <p style={{ color: "#999", fontSize: "18px", marginBottom: "40px", maxWidth: "500px", margin: "0 auto 40px" }}>
          Practice with an AI interviewer, get real-time feedback and land your dream job.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <a href="/register" style={{ background: "#2563eb", color: "white", textDecoration: "none", padding: "12px 32px", borderRadius: "8px", fontWeight: "600" }}>
            Start Free Practice
          </a>
          <a href="/login" style={{ border: "1px solid #555", color: "white", textDecoration: "none", padding: "12px 32px", borderRadius: "8px" }}>
            Sign In
          </a>
        </div>
      </section>

      <section style={{ padding: "60px 32px", maxWidth: "1100px", margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "32px", fontWeight: "bold", marginBottom: "48px" }}>Everything You Need</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
          {[
            { icon: "🤖", title: "AI Interviewer", desc: "Practice with GPT-4 powered questions tailored to your role." },
            { icon: "📄", title: "Resume Upload", desc: "Get personalized questions based on your actual experience." },
            { icon: "📊", title: "Analytics", desc: "Track your scores and improvements across all sessions." },
            { icon: "💬", title: "Instant Feedback", desc: "Get detailed feedback on every answer with tips to improve." },
            { icon: "🎯", title: "Role-Specific", desc: "Frontend, Backend, Full Stack — questions for your target role." },
            { icon: "📈", title: "Score Tracking", desc: "See your performance improve over time with detailed stats." },
          ].map((f) => (
            <div key={f.title} style={{ padding: "24px", background: "#111", border: "1px solid #222", borderRadius: "12px" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>{f.icon}</div>
              <h3 style={{ fontWeight: "600", marginBottom: "8px" }}>{f.title}</h3>
              <p style={{ color: "#888", fontSize: "14px" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ textAlign: "center", padding: "24px", color: "#555", borderTop: "1px solid #222", marginTop: "60px" }}>
        © 2025 InterviewAI. Built with Next.js and OpenAI.
      </footer>
    </main>
  )
}