import { z } from "zod"

/**
 * Roles and difficulties are constrained to a fixed set rather than free text.
 * Both values are interpolated into the LLM system prompt, so accepting
 * arbitrary strings there is a prompt-injection vector.
 */
export const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Mobile Developer",
  "Software Engineer",
] as const

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const

/** Number of questions in a single interview session. */
export const INTERVIEW_QUESTION_COUNT = 5

/**
 * Cap on probing follow-ups per interview. Without a cap a candidate who keeps
 * giving partial answers could spend the whole session on one topic, which is
 * exactly the lack of variety the topic rules exist to prevent.
 */
export const MAX_FOLLOW_UPS = 2

/** Score band where a follow-up is worthwhile: partial understanding only. */
export const FOLLOW_UP_SCORE_RANGE = { min: 3, max: 7 } as const

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email("Enter a valid email address").max(255).toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password is too long")
    .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), {
      message: "Password must contain at least one letter and one number",
    }),
})

export const createInterviewSchema = z.object({
  role: z.enum(ROLES, { message: "Select a valid role" }),
  difficulty: z.enum(DIFFICULTIES, { message: "Select a valid difficulty" }),
  // Defaults to true so an older client that omits the field keeps the
  // existing personalised behaviour.
  useResume: z.boolean().default(true),
})

export const submitAnswerSchema = z.object({
  answer: z.string().trim().min(1, "Answer cannot be empty").max(10000),
  currentQuestionId: z.string().min(1).max(100),
})

/** Returns the first validation message, suitable for showing to the user. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request"
}
