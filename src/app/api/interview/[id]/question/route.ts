import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  generateQuestion,
  evaluateAnswer,
  ModelResponseError,
  ModelUnavailableError,
  type Evaluation,
} from "@/lib/openai"
import {
  badRequest,
  getCurrentUser,
  getResumeContent,
  modelUnavailable,
  notFound,
  serverError,
  tooManyRequests,
  unauthorized,
} from "@/lib/api"
import { rateLimit } from "@/lib/rate-limit"
import {
  FOLLOW_UP_SCORE_RANGE,
  INTERVIEW_QUESTION_COUNT,
  MAX_FOLLOW_UPS,
  firstError,
  submitAnswerSchema,
} from "@/lib/validation"

// Up to two model calls (evaluate, then generate), each with one retry.
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
        evaluation: null,
      })
    }

    // Reaching here with `alreadyEvaluated` and nothing pending means a
    // previous attempt saved the answer but failed before creating the next
    // question. Evaluation is skipped and generation retried, rather than
    // rejecting and leaving the interview with no answerable question.
    const answeredCount = interview.questions.length
    const willContinue = answeredCount < INTERVIEW_QUESTION_COUNT

    // Grading this answer and writing the next question are independent: the
    // generator only reads the previous question text and the resume, never the
    // evaluation. Running them together roughly halves the wait after each
    // answer. Whether the interview continues is known up front, so no call is
    // wasted on the final question.
    const evaluationPromise = alreadyEvaluated
      ? null
      : evaluateAnswer(
          currentQuestion.content,
          answer,
          interview.role,
          interview.difficulty,
          currentQuestion.rubric
        )

    const nextQuestionPromise = willContinue
      ? (async () => {
          // Honours the choice stored when the interview started, so a session
          // that began as generic stays generic even if a resume is uploaded
          // midway.
          const resumeContent = interview.useResume
            ? await getResumeContent(user.id)
            : null

          return generateQuestion(
            interview.role,
            interview.difficulty,
            interview.questions.map((q) => q.content),
            resumeContent
          )
        })()
      : null

    // allSettled rather than all: it consumes both rejections, so a failure in
    // one call cannot surface as an unhandled rejection while the other is
    // still in flight.
    const [evaluationResult, nextQuestionResult] = await Promise.allSettled([
      evaluationPromise,
      nextQuestionPromise,
    ])

    let evaluation: Evaluation | null = null

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

    if (evaluationResult.status === "rejected") {
      const error = evaluationResult.reason
      if (
        error instanceof ModelUnavailableError ||
        error instanceof ModelResponseError
      ) {
        // Nothing is written, so the candidate can resubmit the same answer.
        // Any question generated alongside this is discarded.
        return modelUnavailable("POST /api/interview/[id]/question", error)
      }
      throw error
    }

    if (!alreadyEvaluated) {
      evaluation = evaluationResult.value
      if (!evaluation) {
        throw new Error("Evaluation resolved empty for an unanswered question")
      }

      await prisma.question.update({
        where: { id: currentQuestion.id },
        data: {
          answer,
          score: evaluation.score,
          feedback: evaluation.feedback,
        },
      })
    }

    if (!willContinue) {
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
        // On the recovery path the answer was scored by an earlier attempt, so
        // fall back to what was stored then.
        feedback: evaluation?.feedback ?? currentQuestion.feedback,
        evaluation: forClient(evaluation),
      })
    }

    // A follow-up probes the specific gap this answer showed, so it is only
    // worthwhile for partial understanding: there is nothing to probe when the
    // candidate said nothing, and nothing to add when they covered everything.
    const followUpsSoFar = interview.questions.filter((q) => q.isFollowUp).length

    const followUp =
      evaluation?.followUp &&
      evaluation.score >= FOLLOW_UP_SCORE_RANGE.min &&
      evaluation.score <= FOLLOW_UP_SCORE_RANGE.max &&
      followUpsSoFar < MAX_FOLLOW_UPS &&
      // Never chain: a follow-up to a follow-up drills into one topic and
      // starves the rest of the interview.
      !currentQuestion.isFollowUp
        ? evaluation.followUp
        : null

    // The speculative new-topic question is only needed when no follow-up is
    // being asked, so its failure is not fatal in the follow-up case.
    if (!followUp) {
      if (nextQuestionResult.status === "rejected") {
        const error = nextQuestionResult.reason
        if (
          error instanceof ModelUnavailableError ||
          error instanceof ModelResponseError
        ) {
          // The answer above is already saved. Resubmitting takes the recovery
          // path and retries generation without re-scoring.
          return modelUnavailable("POST /api/interview/[id]/question", error)
        }
        throw error
      }

      if (!nextQuestionResult.value) {
        throw new Error(
          "Question generation resolved empty for a continuing interview"
        )
      }
    }

    const chosen =
      followUp ??
      (nextQuestionResult.status === "fulfilled" && nextQuestionResult.value
        ? nextQuestionResult.value
        : null)

    if (!chosen) {
      throw new Error("No next question available")
    }

    const newQuestion = await prisma.question.create({
      data: {
        interviewId: interview.id,
        content: chosen.question,
        rubric: chosen.rubric,
        isFollowUp: Boolean(followUp),
        order: answeredCount + 1,
      },
    })

    return NextResponse.json({
      finished: false,
      // Text only. Sending the whole object would ship the rubric to the
      // browser and hand the candidate the answer key.
      nextQuestion: chosen.question,
      nextQuestionId: newQuestion.id,
      isFollowUp: Boolean(followUp),
      evaluation: forClient(evaluation),
    })
  } catch (error) {
    return serverError("POST /api/interview/[id]/question", error)
  }
}
