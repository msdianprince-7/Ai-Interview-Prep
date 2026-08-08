import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateQuestion } from "@/lib/openai"
import {
  badRequest,
  getCurrentUser,
  getResumeContent,
  serverError,
  tooManyRequests,
  unauthorized,
} from "@/lib/api"
import { rateLimit } from "@/lib/rate-limit"
import { createInterviewSchema, firstError } from "@/lib/validation"

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const limit = rateLimit(`interview:${user.id}`, 10, 60_000)
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

    const parsed = createInterviewSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(firstError(parsed.error))
    const { role, difficulty } = parsed.data

    // Personalises the interview when the user has uploaded a resume.
    const resumeContent = await getResumeContent(user.id)

    const firstQuestion = await generateQuestion(
      role,
      difficulty,
      [],
      resumeContent
    )

    if (!firstQuestion) {
      return serverError(
        "POST /api/interview",
        new Error("Model returned no question text")
      )
    }

    // Created together so a failed generation cannot leave an empty interview
    // stranded in the user's history.
    const interview = await prisma.interview.create({
      data: {
        userId: user.id,
        role,
        difficulty,
        status: "in_progress",
        questions: { create: { content: firstQuestion, order: 1 } },
      },
      include: { questions: true },
    })

    return NextResponse.json({
      interviewId: interview.id,
      question: firstQuestion,
      questionId: interview.questions[0].id,
      personalized: Boolean(resumeContent),
    })
  } catch (error) {
    return serverError("POST /api/interview", error)
  }
}
