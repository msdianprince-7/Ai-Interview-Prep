"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition"
import { Alert, Badge, Button, Card, Page } from "@/components/ui/shell"

const TOTAL_QUESTIONS = 5

function scoreText(score: number) {
  if (score >= 8) return "text-good"
  if (score >= 6) return "text-brand"
  if (score >= 4) return "text-warn"
  return "text-bad"
}

function scoreBorder(score: number) {
  if (score >= 8) return "border-good"
  if (score >= 6) return "border-brand"
  if (score >= 4) return "border-warn"
  return "border-bad"
}

interface Evaluation {
  score: number
  feedback: string
  strengths?: string[]
  improvements?: string[]
}

interface PastQuestion {
  id: string
  content: string
  answer: string | null
  score: number | null
  feedback: string | null
  order: number
  isFollowUp?: boolean
  // Only sent once the interview is complete; withheld during the interview.
  rubric?: string | null
}

export default function InterviewPage() {
  const router = useRouter()
  const params = useParams()
  const interviewId = params.id as string

  const [question, setQuestion] = useState("")
  const [questionId, setQuestionId] = useState("")
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [feedback, setFeedback] = useState<Evaluation | null>(null)
  const [finished, setFinished] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isFollowUp, setIsFollowUp] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState<{
    question: string
    questionId: string
    isFollowUp: boolean
  } | null>(null)
  const [pastQuestions, setPastQuestions] = useState<PastQuestion[]>([])
  const [mode, setMode] = useState<"text" | "voice">("text")
  const [speaking, setSpeaking] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition()

  useEffect(() => {
    if (mode === "voice" && transcript) setAnswer(transcript)
  }, [transcript, mode])

  // Stop the countdown timer and any in-flight speech when leaving the page,
  // otherwise the interval fires against an unmounted component.
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      SpeechRecognition.stopListening()
      if (typeof window !== "undefined") window.speechSynthesis.cancel()
    }
  }, [])

  const speakQuestion = (text: string) => {
    if (typeof window === "undefined") return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => {
      setSpeaking(false)
      if (mode === "voice") startCountdown()
    }
    window.speechSynthesis.speak(utterance)
  }

  const startCountdown = () => {
    setCountdown(3)
    let count = 3
    countdownRef.current = setInterval(() => {
      count--
      setCountdown(count)
      if (count === 0) {
        clearInterval(countdownRef.current!)
        setCountdown(null)
        SpeechRecognition.startListening({ continuous: true })
      }
    }, 1000)
  }

  useEffect(() => {
    fetch(`/api/interview/${interviewId}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || "Could not load this interview")
        }
        return res.json()
      })
      .then((data) => {
        // A finished interview is shown as a result screen rather than
        // restarting from question one over the top of existing answers.
        if (data.completed) {
          setFinished(true)
          setFinalScore(data.score ?? 0)
          setPastQuestions(data.questions ?? [])
        } else {
          setQuestion(data.question)
          setQuestionId(data.questionId)
          setQuestionNumber(data.questionNumber ?? 1)
          setIsFollowUp(Boolean(data.isFollowUp))
        }
        setInitialLoading(false)
      })
      .catch((err) => {
        setLoadError(err.message)
        setInitialLoading(false)
      })
  }, [interviewId])

  useEffect(() => {
    if (question && mode === "voice" && !initialLoading) speakQuestion(question)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, mode, initialLoading])

  const handleModeSwitch = (newMode: "text" | "voice") => {
    setMode(newMode)
    SpeechRecognition.stopListening()
    window.speechSynthesis.cancel()
    setSpeaking(false)
    setCountdown(null)
    resetTranscript()
    setAnswer("")
    if (newMode === "voice" && question) {
      setTimeout(() => speakQuestion(question), 500)
    }
  }

  const handleStartListening = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
    resetTranscript()
    setAnswer("")
    SpeechRecognition.startListening({ continuous: true })
  }

  const handleSubmit = async () => {
    if (!answer.trim()) return
    setLoading(true)
    setFeedback(null)
    setSubmitError("")
    SpeechRecognition.stopListening()
    window.speechSynthesis.cancel()

    const res = await fetch(`/api/interview/${interviewId}/question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer, currentQuestionId: questionId }),
    })

    const data = await res.json().catch(() => ({}))

    // Covers rate limiting (429), validation (400) and duplicate submits.
    if (!res.ok) {
      setSubmitError(data.error || "Could not submit your answer. Try again.")
      setLoading(false)
      return
    }

    if (data.finished) {
      setFinished(true)
      setFinalScore(data.score)
      setFeedback(data.evaluation)

      // Pull the full transcript so the results screen can show every question
      // with its rubric. Re-using the GET keeps the "only when completed" rule
      // in one place on the server.
      fetch(`/api/interview/${interviewId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((full) => setPastQuestions(full?.questions ?? []))
        .catch(() => setPastQuestions([]))
    } else {
      // Hold the feedback on screen and park the next question until the
      // candidate chooses to continue. It used to advance on a 3s timer, which
      // was not long enough to read the score and feedback.
      setFeedback(data.evaluation)
      setPendingQuestion({
        question: data.nextQuestion,
        questionId: data.nextQuestionId,
        isFollowUp: Boolean(data.isFollowUp),
      })
    }

    setLoading(false)
  }

  const handleContinue = () => {
    if (!pendingQuestion) return
    setQuestion(pendingQuestion.question)
    setQuestionId(pendingQuestion.questionId)
    setIsFollowUp(pendingQuestion.isFollowUp)
    setPendingQuestion(null)
    setAnswer("")
    resetTranscript()
    setQuestionNumber((prev) => prev + 1)
    setFeedback(null)
  }

  if (initialLoading) {
    return (
      <Page center>
        <div className="text-center">
          <div className="mb-4 text-5xl">🤖</div>
          <p className="text-muted">Preparing your interview...</p>
        </div>
      </Page>
    )
  }

  if (loadError) {
    return (
      <Page center>
        <div className="max-w-sm px-4 text-center">
          <div className="mb-4 text-5xl">🔒</div>
          <h1 className="mb-2 text-xl font-bold">Interview unavailable</h1>
          <p className="mb-6 text-muted">{loadError}</p>
          <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
        </div>
      </Page>
    )
  }

  if (finished) {
    return (
      <Page>
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
          <div className="text-center">
            <div className="mb-4 text-6xl">
              {finalScore >= 8 ? "🏆" : finalScore >= 6 ? "👍" : "💪"}
            </div>
            <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Interview Complete!</h1>
            <p className="mb-8 text-muted">Here is how you did</p>
          </div>

          <Card className="mb-6 text-center">
            <div className={`mb-2 text-5xl font-bold ${scoreText(finalScore)}`}>
              {finalScore}/10
            </div>
            <div className="mb-6 text-muted">Overall Score</div>

            {feedback && (
              <div className="text-left">
                <p className="mb-4 leading-relaxed text-body">{feedback.feedback}</p>

                {feedback.strengths && feedback.strengths.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 font-semibold text-good">✅ Strengths</div>
                    {feedback.strengths.map((s, i) => (
                      <div key={i} className="mb-1 text-sm text-body">• {s}</div>
                    ))}
                  </div>
                )}

                {feedback.improvements && feedback.improvements.length > 0 && (
                  <div>
                    <div className="mb-2 font-semibold text-warn">🎯 Areas to Improve</div>
                    {feedback.improvements.map((s, i) => (
                      <div key={i} className="mb-1 text-sm text-body">• {s}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Read-only transcript, shown when revisiting a finished session. */}
          {pastQuestions.length > 0 && (
            <div className="mb-6 flex flex-col gap-3">
              {pastQuestions.map((q) => (
                <Card key={q.id}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-brand">
                        Question {q.order}
                      </span>
                      {q.isFollowUp && <Badge tone="warn">↳ Follow-up</Badge>}
                    </div>
                    {q.score !== null && (
                      <span className={`text-sm font-semibold ${scoreText(q.score)}`}>
                        {q.score}/10
                      </span>
                    )}
                  </div>

                  <p className="mb-3 leading-relaxed break-words text-white/90">{q.content}</p>

                  {q.answer && (
                    <div className="mb-3 rounded-lg bg-ink p-3">
                      <div className="mb-1.5 text-xs text-muted">Your answer</div>
                      <p className="text-sm leading-relaxed break-words text-body">{q.answer}</p>
                    </div>
                  )}

                  {q.feedback && (
                    <p className="mb-3 text-[13px] leading-relaxed break-words text-muted">
                      {q.feedback}
                    </p>
                  )}

                  {/* The grading key, released only after the interview ends. */}
                  {q.rubric && (
                    <div className="rounded-lg border border-brand-deep bg-brand-deep/25 p-3">
                      <div className="mb-2 text-xs font-semibold text-brand">
                        💡 What a strong answer covered
                      </div>
                      {q.rubric
                        .split("\n")
                        .map((line) => line.replace(/^[-•*]\s*/, "").trim())
                        .filter(Boolean)
                        .map((point, i) => (
                          <div key={i} className="mb-1 flex gap-2 text-[13px] leading-relaxed text-body">
                            <span className="text-brand">•</span>
                            <span className="break-words">{point}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={() => router.push("/interview/new")}>Practice Again</Button>
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-8">
        <div className="text-xl font-bold text-brand">InterviewAI</div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-line-2 bg-surface-2 p-1">
            {(["text", "voice"] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeSwitch(m)}
                className={`cursor-pointer rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === m ? "bg-brand-strong text-white" : "text-muted hover:text-white"
                }`}
              >
                {m === "text" ? "✏️ Text" : "🎤 Voice"}
              </button>
            ))}
          </div>
          <div className="text-sm text-muted">
            Question {questionNumber} of {TOTAL_QUESTIONS}
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 h-1.5 rounded bg-line">
          <div
            className="h-full rounded bg-brand-strong transition-all"
            style={{ width: `${(questionNumber / TOTAL_QUESTIONS) * 100}%` }}
          />
        </div>

        <Card className="mb-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="text-2xl">🤖</div>
            <div className="font-semibold text-brand">AI Interviewer</div>
            {/* Signals that this digs into the previous answer rather than
                opening a new topic, so the pivot does not feel random. */}
            {isFollowUp && <Badge tone="warn">↳ Follow-up</Badge>}
            {speaking && (
              <span className="text-xs text-brand">Speaking...</span>
            )}
          </div>

          <p className="text-base leading-relaxed break-words text-white/95 sm:text-lg">
            {question}
          </p>

          {mode === "voice" && (
            <button
              onClick={() => speakQuestion(question)}
              className="mt-3 cursor-pointer rounded-md border border-line-2 px-3 py-1.5 text-[13px] text-muted hover:text-white"
            >
              🔊 Replay Question
            </button>
          )}
        </Card>

        {submitError && <Alert>{submitError}</Alert>}

        {feedback && (
          <Card className={`mb-6 bg-good-bg ${scoreBorder(feedback.score)}`}>
            <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
              <span className={`text-xl font-bold ${scoreText(feedback.score)}`}>
                {feedback.score}/10
              </span>
              <span className="text-[13px] text-muted">
                Your answer to question {questionNumber}
              </span>
            </div>

            <p className="mb-3 text-sm leading-relaxed break-words text-white/90">
              {feedback.feedback}
            </p>

            {feedback.strengths && feedback.strengths.length > 0 && (
              <div className="mb-2.5">
                <div className="mb-1 text-xs font-semibold text-good">✅ Strengths</div>
                {feedback.strengths.map((s, i) => (
                  <div key={i} className="text-[13px] leading-relaxed break-words text-body">• {s}</div>
                ))}
              </div>
            )}

            {feedback.improvements && feedback.improvements.length > 0 && (
              <div className="mb-4">
                <div className="mb-1 text-xs font-semibold text-warn">🎯 To improve</div>
                {feedback.improvements.map((s, i) => (
                  <div key={i} className="text-[13px] leading-relaxed break-words text-body">• {s}</div>
                ))}
              </div>
            )}

            {/* Advancing is an explicit choice; the feedback stays until then. */}
            {pendingQuestion && (
              <Button full onClick={handleContinue}>
                {pendingQuestion.isFollowUp ? "Continue to follow-up →" : "Next question →"}
              </Button>
            )}
          </Card>
        )}

        {!feedback && mode === "text" && (
          <div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={6}
              className="w-full resize-y rounded-xl border border-line-2 bg-surface p-4 text-[15px] leading-relaxed text-white outline-none placeholder:text-muted focus:border-brand"
            />
            <Button
              full
              onClick={handleSubmit}
              disabled={loading || !answer.trim()}
              className="mt-4"
            >
              {loading ? "Evaluating..." : "Submit Answer →"}
            </Button>
          </div>
        )}

        {!feedback && mode === "voice" && (
          <div>
            {!browserSupportsSpeechRecognition && (
              <Alert>⚠️ Voice not supported in this browser. Please use Chrome.</Alert>
            )}

            {countdown !== null ? (
              <Card className="text-center">
                <div className="text-5xl font-bold text-brand">{countdown}</div>
                <div className="mt-2 text-muted">Starting microphone...</div>
              </Card>
            ) : (
              <div>
                <Card className={`mb-4 text-center ${listening ? "border-good" : ""}`}>
                  {listening ? (
                    <div>
                      <div className="mb-2 font-semibold text-good">🎤 Listening...</div>
                      <div className="min-h-16 rounded-lg bg-ink p-3 text-left text-sm leading-relaxed break-words text-body">
                        {transcript || "Start speaking..."}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-3 text-5xl">🎤</div>
                      <div className="text-sm text-muted">
                        {answer
                          ? "Recording stopped. Review your answer below."
                          : "Click the button to start speaking"}
                      </div>
                    </div>
                  )}
                </Card>

                {answer && !listening && (
                  <Card className="mb-4">
                    <div className="mb-2 text-xs text-muted">Your Answer:</div>
                    <p className="text-sm leading-relaxed break-words text-body">{answer}</p>
                    <button
                      onClick={() => {
                        resetTranscript()
                        setAnswer("")
                      }}
                      className="mt-2 cursor-pointer rounded-md border border-line-2 px-3 py-1 text-xs text-muted hover:text-white"
                    >
                      🗑️ Clear &amp; Re-record
                    </button>
                  </Card>
                )}

                {/* Stacks on phones so both controls stay tappable. */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  {!listening ? (
                    <Button variant="success" full onClick={handleStartListening}>
                      🎤 Start Speaking
                    </Button>
                  ) : (
                    <Button variant="danger" full onClick={() => SpeechRecognition.stopListening()}>
                      ⏹️ Stop Recording
                    </Button>
                  )}
                  <Button
                    full
                    onClick={handleSubmit}
                    disabled={loading || !answer.trim() || listening}
                  >
                    {loading ? "Evaluating..." : "Submit Answer →"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Page>
  )
}
