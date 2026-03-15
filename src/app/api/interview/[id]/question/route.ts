import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateQuestion, evaluateAnswer } from "@/lib/openai"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: interviewId } = await params
    const { answer, currentQuestionId } = await req.json()

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: { questions: { orderBy: { order: "asc" } } }
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    const currentQuestion = await prisma.question.findUnique({
      where: { id: currentQuestionId }
    })

    if (!currentQuestion) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // Evaluate the answer
    const evaluation = await evaluateAnswer(
      currentQuestion.content,
      answer,
      interview.role
    )

    // Save answer and score
    await prisma.question.update({
      where: { id: currentQuestionId },
      data: {
        answer,
        score: evaluation.score,
        feedback: evaluation.feedback
      }
    })

    const questionNumber = interview.questions.length

    // End interview after 5 questions
    if (questionNumber >= 5) {
      const allQuestions = await prisma.question.findMany({
        where: { interviewId }
      })

      const avgScore = Math.round(
        allQuestions.reduce((a, b) => a + (b.score || 0), 0) / allQuestions.length
      )

      await prisma.interview.update({
        where: { id: interviewId },
        data: {
          status: "completed",
          score: avgScore,
          completedAt: new Date()
        }
      })

      return NextResponse.json({
        finished: true,
        score: avgScore,
        feedback: evaluation.feedback,
        evaluation
      })
    }

    // Generate next question
    const previousQuestions = interview.questions.map((q) => q.content)
    const nextQuestion = await generateQuestion(
      interview.role,
      interview.difficulty,
      previousQuestions
    )

    const newQuestion = await prisma.question.create({
      data: {
        interviewId,
        content: nextQuestion!,
        order: questionNumber + 1
      }
    })

    return NextResponse.json({
      finished: false,
      nextQuestion,
      nextQuestionId: newQuestion.id,
      evaluation
    })

  } catch (error: any) {
    console.error("Question route error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}