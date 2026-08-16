"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Alert, Button, Card, Field, Page } from "@/components/ui/shell"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Mirrors registerSchema in src/lib/validation.ts; the server enforces the
    // same rules regardless of what happens here.
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      setLoading(false)
      return
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least one letter and one number")
      setLoading(false)
      return
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Something went wrong")
      setLoading(false)
    } else {
      router.push("/login?registered=true")
    }
  }

  return (
    <Page center>
      <div className="w-full max-w-sm px-4 py-10">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-brand">
            InterviewAI
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Create account</h1>
          <p className="mt-2 text-muted">Start practicing interviews for free</p>
        </div>

        <Card>
          {error && <Alert>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Field
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Jane Doe"
            />

            <Field
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />

            <Field
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Min 8 characters, letters and numbers"
            />

            <Button type="submit" full disabled={loading} className="mt-2">
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </Page>
  )
}
