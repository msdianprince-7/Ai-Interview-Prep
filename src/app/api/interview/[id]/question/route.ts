import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateQuestion, evaluateAnswer } from "@/lib/openai"
import {
  badRequest,
  getCurrentUser,
  getResumeContent,
  notFound,
  serverError,
  tooManyRequests,
  unauthorized,
} from "@/lib/api"
import { rateLimit } from "@/lib/rate-limit"
import {
  INTERVIEW_QUESTION_COUNT,
  firstError,
  submitAnswerSchema,
} from "@/lib/validation"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    // Two LLM calls per request, so this is the most expensive endpoint.
    const limit = rateLimit(`answer:${user.id}`, 30, 60_000)
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

    const { id: interviewId } = await params

    const parsed = submitAnswerSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(firstError(parsed.error))
    const { answer, currentQuestionId } = parsed.data

    // Ownership is enforced here; every lookup below is scoped to this row.
    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, userId: user.id },
      include: { questions: { orderBy: { order: "asc" } } },
    })

    if (!interview) return notFound("Interview not found")

    if (interview.status === "completed") {
      return badRequest("This interview is already complete")
    }

    // The question must belong to *this* interview. Previously it was fetched
    // by ID alone, which allowed writing an answer into another interview.
    const currentQuestion = interview.questions.find(
      (q) => q.id === currentQuestionId
    )

    if (!currentQuestion) return notFound("Question not found")

    // Prevents replaying an answer to re-roll a score, and stops a double
    // submit from advancing the interview twice.
    if (currentQuestion.answer !== null) {
      return badRequest("This question has already been answered")
    }

    const evaluation = await evaluateAnswer(
      currentQuestion.content,
      answer,
      interview.role
    )

    await prisma.question.update({
      where: { id: currentQuestion.id },
      data: {
        answer,
        score: evaluation.score,
        feedback: evaluation.feedback,
      },
    })

    const answeredCount = interview.questions.length

    if (answeredCount >= INTERVIEW_QUESTION_COUNT) {
      const allQuestions = await prisma.question.findMany({
        where: { interviewId: interview.id },
      })

      const scored = allQuestions.filter((q) => q.score !== null)
      const avgScore = scored.length
        ? Math.round(
            scored.reduce((total, q) => total + (q.score ?? 0), 0) / scored.length
          )
        : 0

      await prisma.interview.update({
        where: { id: interview.id },
        data: {
          status: "completed",
          score: avgScore,
          completedAt: new Date(),
        },
      })

      return NextResponse.json({
        finished: true,
        score: avgScore,
        feedback: evaluation.feedback,
        evaluation,
      })
    }

    // Honours the choice stored when the interview started, so a session that
    // began as generic stays generic even if a resume is uploaded midway.
    const resumeContent = interview.useResume
      ? await getResumeContent(user.id)
      : null

    const previousQuestions = interview.questions.map((q) => q.content)
    const nextQuestion = await generateQuestion(
      interview.role,
      interview.difficulty,
      previousQuestions,
      resumeContent
    )

    if (!nextQuestion) {
      return serverError(
        "POST /api/interview/[id]/question",
        new Error("Model returned no question text")
      )
    }

    const newQuestion = await prisma.question.create({
      data: {
        interviewId: interview.id,
        content: nextQuestion,
        order: answeredCount + 1,
      },
    })

    return NextResponse.json({
      finished: false,
      nextQuestion,
      nextQuestionId: newQuestion.id,
      evaluation,
    })
  } catch (error) {
    return serverError("POST /api/interview/[id]/question", error)
  }
}
