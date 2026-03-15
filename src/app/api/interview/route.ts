import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateQuestion } from "@/lib/openai"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { role, difficulty } = body

    if (!role || !difficulty) {
      return NextResponse.json({ error: "Role and difficulty required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const interview = await prisma.interview.create({
      data: { userId: user.id, role, difficulty, status: "in_progress" }
    })

    const firstQuestion = await generateQuestion(role, difficulty, [])

    if (!firstQuestion) {
      return NextResponse.json({ error: "Failed to generate question" }, { status: 500 })
    }

    const question = await prisma.question.create({
      data: { interviewId: interview.id, content: firstQuestion, order: 1 }
    })

    return NextResponse.json({
      interviewId: interview.id,
      question: firstQuestion,
      questionId: question.id
    })

  } catch (error: any) {
    console.error("Interview creation error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}