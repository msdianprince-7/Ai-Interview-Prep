import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * Resolves the signed-in user from the session and loads the DB record.
 * Returns null when there is no valid session or the user no longer exists,
 * so callers can respond with a 401 without branching on both cases.
 */
export async function getCurrentUser() {
  const session = await auth()
  const id = session?.user?.id
  const email = session?.user?.email

  if (!id && !email) return null

  return prisma.user.findUnique({
    where: id ? { id } : { email: email as string },
  })
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

/**
 * Upstream model failure. 503 rather than 500 because the request is worth
 * retrying unchanged, and nothing was persisted.
 */
export function modelUnavailable(context: string, error: unknown) {
  console.error(`[${context}] model failure`, error)
  return NextResponse.json(
    {
      error:
        "The interview model is temporarily unavailable. Please try again in a moment.",
      retryable: true,
    },
    { status: 503, headers: { "Retry-After": "5" } }
  )
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  )
}

/**
 * Logs the real error server-side and returns an opaque message to the client.
 * Prisma and Groq errors carry connection strings, schema details and key
 * fragments, none of which should reach the browser.
 */
export function serverError(context: string, error: unknown) {
  console.error(`[${context}]`, error)
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  )
}
