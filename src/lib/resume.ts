import { prisma } from "@/lib/prisma"

/**
 * Latest resume text for a user, or null if they have not uploaded one.
 * Question generation is personalised whenever this returns content.
 *
 * Kept out of `lib/api.ts` so the interview graph depends only on data access,
 * not on the HTTP layer (`next/server`, session handling).
 */
export async function getResumeContent(userId: string) {
  const resume = await prisma.resume.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { content: true },
  })

  return resume?.content ?? null
}
