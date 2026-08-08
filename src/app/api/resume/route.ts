import { NextRequest, NextResponse } from "next/server"
import { extractText } from "unpdf"
import { prisma } from "@/lib/prisma"
import {
  badRequest,
  getCurrentUser,
  serverError,
  tooManyRequests,
  unauthorized,
} from "@/lib/api"
import { rateLimit } from "@/lib/rate-limit"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_EXTRACTED_CHARS = 3000

/** PDFs begin with "%PDF-". The client-supplied MIME type is not evidence. */
function looksLikePdf(bytes: Uint8Array) {
  return (
    bytes.length > 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    // PDF parsing is CPU-bound; cap it well below the answer endpoint.
    const limit = rateLimit(`resume:${user.id}`, 10, 60 * 60_000)
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

    const formData = await req.formData()
    const file = formData.get("resume")

    if (!file || typeof file === "string") {
      return badRequest("No file uploaded")
    }

    if (file.size > MAX_BYTES) {
      return badRequest("File is too large (5 MB maximum)")
    }

    if (file.type !== "application/pdf") {
      return badRequest("Only PDF files are allowed")
    }

    const bytes = new Uint8Array(await file.arrayBuffer())

    if (!looksLikePdf(bytes)) {
      return badRequest("That file is not a valid PDF")
    }

    let extractedText: string
    try {
      const { text } = await extractText(bytes, { mergePages: true })
      extractedText = text.slice(0, MAX_EXTRACTED_CHARS)
    } catch {
      // A malformed or encrypted PDF is user error, not a server fault.
      return badRequest("Could not read that PDF. Try re-exporting it.")
    }

    if (!extractedText.trim()) {
      return badRequest(
        "No text found in that PDF. Scanned images are not supported."
      )
    }

    // One resume per user: replace and insert together so a failure cannot
    // leave the user with no resume at all.
    const resume = await prisma.$transaction(async (tx) => {
      await tx.resume.deleteMany({ where: { userId: user.id } })
      return tx.resume.create({
        data: {
          userId: user.id,
          // Filenames are echoed back into the UI; strip path separators.
          filename: file.name.replace(/[/\\]/g, "_").slice(0, 255),
          content: extractedText,
        },
      })
    })

    return NextResponse.json({
      success: true,
      resumeId: resume.id,
      filename: resume.filename,
      preview: extractedText.slice(0, 200),
    })
  } catch (error) {
    return serverError("POST /api/resume", error)
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const resume = await prisma.resume.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      // The full extracted text is not needed by the UI.
      select: { id: true, filename: true, createdAt: true },
    })

    return NextResponse.json({ resume })
  } catch (error) {
    return serverError("GET /api/resume", error)
  }
}
