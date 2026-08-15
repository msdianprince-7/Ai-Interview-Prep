import { Annotation, END, START, StateGraph } from "@langchain/langgraph"
import type { Question } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getResumeContent } from "@/lib/resume"
import {
  evaluateAnswer,
  generateQuestion,
  type Evaluation,
  type GeneratedQuestion,
} from "@/lib/openai"
import {
  FOLLOW_UP_SCORE_RANGE,
  INTERVIEW_QUESTION_COUNT,
  MAX_FOLLOW_UPS,
} from "@/lib/validation"

/**
 * The interview turn as a state graph.
 *
 * One submitted answer drives one run. The flow branches on how the answer
 * scored, which is why it is expressed as a graph rather than a chain:
 *
 *            START
 *           /     \
 *    evaluate     speculate        (parallel: independent model calls)
 *           \     /
 *            join                  (waits for both)
 *              |
 *        route (conditional)
 *        /     |      \
 * follow_up  new_topic  finalize
 *        \     |      /
 *             END
 *
 * `speculate` drafts a fresh-topic question while `evaluate` is still grading.
 * The two calls do not depend on each other, so running them in the same
 * superstep keeps the latency win measured before this port (~43%). If the
 * answer turns out to warrant a follow-up, the speculative question is simply
 * not persisted.
 */

export type TurnOutcome =
  | { finished: true; score: number; evaluation: Evaluation | null }
  | {
      finished: false
      nextQuestion: string
      nextQuestionId: string
      isFollowUp: boolean
      evaluation: Evaluation | null
    }

const InterviewState = Annotation.Root({
  // --- inputs, fixed for the run ---
  interviewId: Annotation<string>,
  userId: Annotation<string>,
  role: Annotation<string>,
  difficulty: Annotation<string>,
  useResume: Annotation<boolean>,
  answer: Annotation<string>,
  currentQuestion: Annotation<Question>,
  questions: Annotation<Question[]>,
  /** Set when a previous run graded this answer but failed before creating the
   *  next question. Evaluation is then skipped and only generation is retried. */
  alreadyEvaluated: Annotation<boolean>,

  // --- produced by nodes ---
  evaluation: Annotation<Evaluation | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  speculative: Annotation<GeneratedQuestion | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  outcome: Annotation<TurnOutcome | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
})

type State = typeof InterviewState.State

/** Grades the answer and records it. Skipped on the recovery path. */
async function evaluateNode(state: State) {
  if (state.alreadyEvaluated) return { evaluation: null }

  const evaluation = await evaluateAnswer(
    state.currentQuestion.content,
    state.answer,
    state.role,
    state.difficulty,
    state.currentQuestion.rubric
  )

  await prisma.question.update({
    where: { id: state.currentQuestion.id },
    data: {
      answer: state.answer,
      score: evaluation.score,
      feedback: evaluation.feedback,
    },
  })

  return { evaluation }
}

/**
 * Drafts a new-topic question in parallel with grading. Skipped on the last
 * question, where no further question is needed. Failures are swallowed: the
 * run may still end on the follow-up branch, which does not need this result.
 */
async function speculateNode(state: State) {
  if (state.questions.length >= INTERVIEW_QUESTION_COUNT) {
    return { speculative: null }
  }

  const resumeContent = state.useResume
    ? await getResumeContent(state.userId)
    : null

  try {
    const speculative = await generateQuestion(
      state.role,
      state.difficulty,
      state.questions.map((q) => q.content),
      resumeContent
    )
    return { speculative }
  } catch {
    return { speculative: null }
  }
}

/** Join point: exists so routing waits for both parallel branches. */
function joinNode() {
  return {}
}

function shouldFollowUp(state: State) {
  const followUpsSoFar = state.questions.filter((q) => q.isFollowUp).length

  return Boolean(
    state.evaluation?.followUp &&
      state.evaluation.score >= FOLLOW_UP_SCORE_RANGE.min &&
      state.evaluation.score <= FOLLOW_UP_SCORE_RANGE.max &&
      followUpsSoFar < MAX_FOLLOW_UPS &&
      // Never chain: a follow-up to a follow-up starves the other topics.
      !state.currentQuestion.isFollowUp
  )
}

/** The branching rule, named and isolated so the flow is readable. */
function route(state: State): "finalize" | "follow_up" | "new_topic" {
  if (state.questions.length >= INTERVIEW_QUESTION_COUNT) return "finalize"
  return shouldFollowUp(state) ? "follow_up" : "new_topic"
}

async function persistNextQuestion(
  state: State,
  next: GeneratedQuestion,
  isFollowUp: boolean
): Promise<{ outcome: TurnOutcome }> {
  const created = await prisma.question.create({
    data: {
      interviewId: state.interviewId,
      content: next.question,
      rubric: next.rubric,
      isFollowUp,
      order: state.questions.length + 1,
    },
  })

  return {
    outcome: {
      finished: false,
      nextQuestion: next.question,
      nextQuestionId: created.id,
      isFollowUp,
      evaluation: state.evaluation,
    },
  }
}

async function followUpNode(state: State) {
  // Guarded by `route`, which only selects this branch when a follow-up exists.
  const followUp = state.evaluation?.followUp
  if (!followUp) throw new Error("follow_up reached without a drafted follow-up")

  return persistNextQuestion(state, followUp, true)
}

async function newTopicNode(state: State) {
  const next = state.speculative

  // The speculative call failed and this branch needs it, so retry once here
  // rather than failing the turn. Errors propagate to the route as a 503.
  if (!next) {
    const resumeContent = state.useResume
      ? await getResumeContent(state.userId)
      : null

    const regenerated = await generateQuestion(
      state.role,
      state.difficulty,
      state.questions.map((q) => q.content),
      resumeContent
    )
    return persistNextQuestion(state, regenerated, false)
  }

  return persistNextQuestion(state, next, false)
}

async function finalizeNode(state: State) {
  const allQuestions = await prisma.question.findMany({
    where: { interviewId: state.interviewId },
  })

  const scored = allQuestions.filter((q) => q.score !== null)
  const score = scored.length
    ? Math.round(
        scored.reduce((total, q) => total + (q.score ?? 0), 0) / scored.length
      )
    : 0

  await prisma.interview.update({
    where: { id: state.interviewId },
    data: { status: "completed", score, completedAt: new Date() },
  })

  return {
    outcome: { finished: true, score, evaluation: state.evaluation } as TurnOutcome,
  }
}

const workflow = new StateGraph(InterviewState)
  .addNode("evaluate", evaluateNode)
  .addNode("speculate", speculateNode)
  .addNode("join", joinNode)
  .addNode("follow_up", followUpNode)
  .addNode("new_topic", newTopicNode)
  .addNode("finalize", finalizeNode)
  // Fan out: both model calls start in the same superstep.
  .addEdge(START, "evaluate")
  .addEdge(START, "speculate")
  // Join: `join` has two incoming edges, so it waits for both to settle.
  .addEdge("evaluate", "join")
  .addEdge("speculate", "join")
  .addConditionalEdges("join", route, ["follow_up", "new_topic", "finalize"])
  .addEdge("follow_up", END)
  .addEdge("new_topic", END)
  .addEdge("finalize", END)

export const interviewGraph = workflow.compile()

export type TurnInput = {
  interviewId: string
  userId: string
  role: string
  difficulty: string
  useResume: boolean
  answer: string
  currentQuestion: Question
  questions: Question[]
  alreadyEvaluated: boolean
}

export async function runInterviewTurn(input: TurnInput): Promise<TurnOutcome> {
  const result = await interviewGraph.invoke(input)

  if (!result.outcome) {
    throw new Error("Interview graph finished without producing an outcome")
  }

  return result.outcome
}
