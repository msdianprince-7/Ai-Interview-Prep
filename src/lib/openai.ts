import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function generateQuestion(
  role: string,
  difficulty: string,
  previousQuestions: string[],
  resumeContent?: string
) {
  const resumeContext = resumeContent
    ? `The candidate's resume shows: ${resumeContent.slice(0, 500)}. Ask questions relevant to their experience.`
    : ""

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You are a senior technical interviewer for ${role} positions.
Ask ONE ${difficulty} difficulty interview question.
${resumeContext}
${previousQuestions.length > 0 ? `Do not repeat these: ${previousQuestions.join(" | ")}` : ""}
Return only the question text, nothing else.`
      }
    ],
    max_tokens: 200
  })
  return response.choices[0].message.content
}

export async function evaluateAnswer(
  question: string,
  answer: string,
  role: string
) {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You are a strict technical interviewer evaluating a ${role} interview answer.
Be honest and critical. Do NOT give high scores for vague or incorrect answers.

Scoring guide:
- 1-2: No answer, completely wrong, or "no idea"
- 3-4: Very weak, missing key concepts
- 5-6: Partial understanding, missing important details
- 7-8: Good answer with minor gaps
- 9-10: Excellent, complete, well explained

Question: ${question}
Answer: ${answer}

If the answer is blank, "no idea", "don't know" or clearly wrong, give score 1 or 2.

Return ONLY a JSON object:
{
  "score": <number 1-10>,
  "feedback": "<honest 2-3 sentence feedback>",
  "strengths": ["<only real strengths, if none say 'None demonstrated'>"],
  "improvements": ["<specific things to study>"]
}`
      }
    ],
    max_tokens: 500
  })

  try {
    const text = response.choices[0].message.content || "{}"
    const clean = text.replace(/```json|```/g, "").trim()
    return JSON.parse(clean)
  } catch {
    return {
      score: 1,
      feedback: "Could not evaluate answer.",
      strengths: ["None demonstrated"],
      improvements: ["Please provide a real answer"]
    }
  }
}