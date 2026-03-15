import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { extractText } from "unpdf"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("resume") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files allowed" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = new Uint8Array(bytes)
    const { text } = await extractText(buffer, { mergePages: true })
    const extractedText = text.slice(0, 3000)

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await prisma.resume.deleteMany({
      where: { userId: user.id }
    })

    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        filename: file.name,
        content: extractedText
      }
    })

    return NextResponse.json({
      success: true,
      resumeId: resume.id,
      filename: file.name,
      preview: extractedText.slice(0, 200)
    })

  } catch (error: any) {
    console.error("Resume upload error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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

    const resume = await prisma.resume.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ resume })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}