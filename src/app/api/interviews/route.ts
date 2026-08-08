import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, serverError, unauthorized } from "@/lib/api"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const interviews = await prisma.interview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    })

    return NextResponse.json({ interviews })
  } catch (error) {
    return serverError("GET /api/interviews", error)
  }
}
