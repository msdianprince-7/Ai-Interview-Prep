import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  ModelResponseError,
  ModelUnavailableError,
  type Evaluation,
} from "@/lib/openai"
import { runInterviewTurn } from "@/lib/interview-graph"
import {
  badRequest,
  getCurrentUser,
  modelUnavailable,
  notFound,
  serverError,
  tooManyRequests,
  unauthorized,
} from "@/lib/api"
import { rateLimit } from "@/lib/rate-limit"
import { firstError, submitAnswerSchema } from "@/lib/validation"

// Up to two model calls per turn, each with one retry.
export const maxDuration = 60

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

    const alreadyEvaluated = currentQuestion.answer !== null

    // A question still awaiting an answer means the client is out of step
    // (stale tab, double submit). Resend it instead of re-scoring anything.
    const pending = interview.questions.find(
      (q) => q.answer === null && q.id !== currentQuestion.id
    )

    if (alreadyEvaluated && pending) {
      return NextResponse.json({
        finished: false,
        nextQuestion: pending.content,
        nextQuestionId: pending.id,
        isFollowUp: pending.isFollowUp,
        evaluation: null,
      })
    }

    /**
     * The evaluation carries the drafted follow-up and its rubric. Only the
     * candidate-facing fields may be serialised: returning the raw object would
     * hand over both the next question and its grading key.
     */
    const forClient = (e: Evaluation | null) =>
      e
        ? {
            score: e.score,
            feedback: e.feedback,
            strengths: e.strengths,
            improvements: e.improvements,
          }
        : null

    // Orchestration lives in the graph: grade and draft in parallel, then
    // branch to a follow-up, a new topic, or completion.
    let outcome
    try {
      outcome = await runInterviewTurn({
        interviewId: interview.id,
        userId: user.id,
        role: interview.role,
        difficulty: interview.difficulty,
        useResume: interview.useResume,
        answer,
        currentQuestion,
        questions: interview.questions,
        alreadyEvaluated,
      })
    } catch (error) {
      if (
        error instanceof ModelUnavailableError ||
        error instanceof ModelResponseError
      ) {
        // Either nothing was written (grading failed, so the answer can be
        // resubmitted) or the answer was saved and only generation failed, in
        // which case resubmitting takes the recovery path.
        return modelUnavailable("POST /api/interview/[id]/question", error)
      }
      throw error
    }

    if (outcome.finished) {
      return NextResponse.json({
        finished: true,
        score: outcome.score,
        // On the recovery path the answer was scored by an earlier attempt, so
        // fall back to what was stored then.
        feedback: outcome.evaluation?.feedback ?? currentQuestion.feedback,
        evaluation: forClient(outcome.evaluation),
      })
    }

    return NextResponse.json({
      finished: false,
      // Text only. Sending the whole object would ship the rubric to the
      // browser and hand the candidate the answer key.
      nextQuestion: outcome.nextQuestion,
      nextQuestionId: outcome.nextQuestionId,
      isFollowUp: outcome.isFollowUp,
      evaluation: forClient(outcome.evaluation),
    })
  } catch (error) {
    return serverError("POST /api/interview/[id]/question", error)
  }
}
