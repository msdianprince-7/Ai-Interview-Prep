"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Alert, Button, Card, Field, Page } from "@/components/ui/shell"

// useSearchParams opts the subtree out of prerendering, so it is isolated
// behind a Suspense boundary to keep the build from failing.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
      // Return the user to the page middleware bounced them from. Only
      // same-site paths are honoured, so this cannot be used as an open
      // redirect to an attacker's domain.
      const callbackUrl = searchParams.get("callbackUrl")
      const target =
        callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/dashboard"
      router.push(target)
    }
  }

  return (
    <Page center>
      <div className="w-full max-w-sm px-4 py-10">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-brand">
            InterviewAI
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Welcome back</h1>
          <p className="mt-2 text-muted">Sign in to your account</p>
        </div>

        <Card>
          {error && <Alert>{error}</Alert>}

          <form onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              placeholder="Your password"
            />

            <Button type="submit" full disabled={loading} className="mt-2">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-brand hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </Page>
  )
}
