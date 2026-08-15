import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  generateQuestion,
  ModelResponseError,
  ModelUnavailableError,
} from "@/lib/openai"
import {
  badRequest,
  getCurrentUser,
  modelUnavailable,
  serverError,
  tooManyRequests,
  unauthorized,
} from "@/lib/api"
import { getResumeContent } from "@/lib/resume"
import { rateLimit } from "@/lib/rate-limit"
import { createInterviewSchema, firstError } from "@/lib/validation"

// One model call plus retry. Must exceed the client's worst-case wait so a
// slow upstream returns 503 instead of being cut off by the platform.
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const limit = rateLimit(`interview:${user.id}`, 10, 60_000)
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

    const parsed = createInterviewSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(firstError(parsed.error))
    const { role, difficulty, useResume } = parsed.data

    // Personalises the interview when requested and a resume exists.
    const resumeContent = useResume ? await getResumeContent(user.id) : null

    // Generated before the interview row is created, so a model failure leaves
    // no empty interview behind in the user's history.
    let firstQuestion
    try {
      firstQuestion = await generateQuestion(role, difficulty, [], resumeContent)
    } catch (error) {
      if (
        error instanceof ModelUnavailableError ||
        error instanceof ModelResponseError
      ) {
        return modelUnavailable("POST /api/interview", error)
      }
      throw error
    }

    // Created together so a failed generation cannot leave an empty interview
    // stranded in the user's history.
    const interview = await prisma.interview.create({
      data: {
        userId: user.id,
        role,
        difficulty,
        useResume,
        status: "in_progress",
        questions: {
          create: {
            content: firstQuestion.question,
            rubric: firstQuestion.rubric,
            order: 1,
          },
        },
      },
      include: { questions: true },
    })

    return NextResponse.json({
      interviewId: interview.id,
      // Only the question text goes to the client; the rubric is grading
      // material and would hand the candidate the answer.
      question: firstQuestion.question,
      questionId: interview.questions[0].id,
      personalized: Boolean(resumeContent),
    })
  } catch (error) {
    return serverError("POST /api/interview", error)
  }
}
