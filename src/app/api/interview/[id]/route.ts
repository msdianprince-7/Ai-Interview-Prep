import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: "asc" } } }
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    const firstQuestion = interview.questions[0]

    if (!firstQuestion) {
      return NextResponse.json({ error: "No questions found" }, { status: 404 })
    }

    return NextResponse.json({
      question: firstQuestion.content,
      questionId: firstQuestion.id,
      role: interview.role,
      difficulty: interview.difficulty
    })

  } catch (error: any) {
    console.error("GET interview error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}