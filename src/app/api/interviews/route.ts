import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const interviews = await prisma.interview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        questions: {
          orderBy: { order: "asc" }
        }
      }
    })

    return NextResponse.json({ interviews })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
