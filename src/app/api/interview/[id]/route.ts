import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, notFound, serverError, unauthorized } from "@/lib/api"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { id } = await params

    // Scoped by userId: another user's interview resolves to null and is
    // reported as 404 rather than 403, so IDs cannot be probed for existence.
    const interview = await prisma.interview.findFirst({
      where: { id, userId: user.id },
      include: { questions: { orderBy: { order: "asc" } } },
    })

    if (!interview) return notFound("Interview not found")

    if (interview.questions.length === 0) {
      return notFound("No questions found")
    }

    // Resume where the candidate left off instead of always returning the
    // first question, which previously let a revisit overwrite past answers.
    const currentQuestion =
      interview.questions.find((q) => q.answer === null) ?? null

    return NextResponse.json({
      status: interview.status,
      role: interview.role,
      difficulty: interview.difficulty,
      score: interview.score,
      questionNumber: currentQuestion ? currentQuestion.order : interview.questions.length,
      totalQuestions: interview.questions.length,
      question: currentQuestion?.content ?? null,
      questionId: currentQuestion?.id ?? null,
      // Completed interviews are returned as a read-only transcript.
      completed: interview.status === "completed" || currentQuestion === null,
      questions:
        interview.status === "completed" || currentQuestion === null
          ? interview.questions.map((q) => ({
              id: q.id,
              content: q.content,
              answer: q.answer,
              score: q.score,
              feedback: q.feedback,
              order: q.order,
            }))
          : undefined,
    })
  } catch (error) {
    return serverError("GET /api/interview/[id]", error)
  }
}
