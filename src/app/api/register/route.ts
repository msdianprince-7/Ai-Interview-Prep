import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { badRequest, serverError, tooManyRequests } from "@/lib/api"
import { clientIp, rateLimit } from "@/lib/rate-limit"
import { firstError, registerSchema } from "@/lib/validation"

export async function POST(req: NextRequest) {
  try {
    // Unauthenticated and account-creating, so limited by IP.
    const limit = rateLimit(`register:${clientIp(req)}`, 5, 60 * 60_000)
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

    const parsed = registerSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(firstError(parsed.error))
    const { name, email, password } = parsed.data

    const hashedPassword = await bcrypt.hash(password, 12)

    try {
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword },
      })
      return NextResponse.json({ message: "Account created", userId: user.id })
    } catch (error) {
      // Relying on the unique constraint rather than a prior findUnique closes
      // the race where two concurrent signups both pass the existence check.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return badRequest("Email already registered")
      }
      throw error
    }
  } catch (error) {
    return serverError("POST /api/register", error)
  }
}
