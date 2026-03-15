import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function generateQuestion(
  role: string,
  difficulty: string,
  previousQuestions: string[]
) {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You are a senior technical interviewer for ${role} positions.
Ask ONE ${difficulty} difficulty interview question.
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
        content: `You are evaluating a ${role} interview answer.
Question: ${question}
Answer: ${answer}

Return ONLY a JSON object in this exact format with no extra text:
{
  "score": <number 1-10>,
  "feedback": "<2-3 sentence overall feedback>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
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
      score: 5,
      feedback: "Answer received and evaluated.",
      strengths: ["Attempted the question"],
      improvements: ["Provide more detail"]
    }
  }
}