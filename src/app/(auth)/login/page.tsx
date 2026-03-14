"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      setLoading(false)
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", fontFamily: "Arial", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "400px", padding: "0 16px" }}>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Link href="/" style={{ color: "#60a5fa", fontSize: "24px", fontWeight: "bold", textDecoration: "none" }}>
            InterviewAI
          </Link>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", marginTop: "16px" }}>Welcome back</h1>
          <p style={{ color: "#888", marginTop: "8px" }}>Sign in to your account</p>
        </div>

        <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "32px" }}>
          {error && (
            <div style={{ background: "#2d1515", border: "1px solid #ef4444", color: "#ef4444", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#ccc" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{ width: "100%", padding: "10px 12px", background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#ccc" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: "100%", padding: "10px 12px", background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "12px", background: loading ? "#1d4ed8" : "#2563eb", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "24px", color: "#888", fontSize: "14px" }}>
          Don&apos;t have an account?{" "}
          <a href="/register" style={{ color: "#60a5fa", textDecoration: "none" }}>
            Create one
          </a>
        </p>
      </div>
    </main>
  )
}