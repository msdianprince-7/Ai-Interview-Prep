import OpenAI from "openai"
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateQuestion(role: string, difficulty: string, previousQuestions: string[] = []) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: `You are a senior technical interviewer for ${role} positions. 
      Ask a ${difficulty} difficulty interview question. 
      Do not repeat: ${previousQuestions.join(", ")}.
      Return only the question, nothing else.`
    }],
    max_tokens: 200
  })
  return response.choices[0].message.content
}

export async function evaluateAnswer(question: string, answer: string, role: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: `You are evaluating a ${role} interview answer. 
      Question: ${question}
      Answer: ${answer}
      
      Return JSON: { "score": 0-10, "feedback": "detailed feedback", "strengths": ["..."], "improvements": ["..."] }`
    }],
    response_format: { type: "json_object" },
    max_tokens: 500
  })
  return JSON.parse(response.choices[0].message.content!)
}