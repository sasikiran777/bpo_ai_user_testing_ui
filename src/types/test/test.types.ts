export type TestType = 'english'

export type TestSessionStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'grading'
  | 'completed'
  | 'failed'

export type ProctoringEventType = 'tab_hidden' | 'tab_visible' | 'window_blur' | 'window_focus'

export type ProctoringEvent = {
  type: ProctoringEventType
  ts: number
}

export type EnglishSection = 'writing' | 'reading' | 'speaking'

export type WritingSubmission = {
  aboutMe: string
  location: string
  experience: string
  roles: string
  responsibilities: string
  other: string
  startedAt: number
  submittedAt: number
  proctoring: ProctoringEvent[]
}

export type ReadingQuestionType = 'mcq' | 'blank' | 'short'

export type ReadingQuestionBase = {
  id: string
  type: ReadingQuestionType
  prompt: string
}

export type ReadingMcqQuestion = ReadingQuestionBase & {
  type: 'mcq'
  options: string[]
  correctAnswer: string
}

export type ReadingBlankQuestion = ReadingQuestionBase & {
  type: 'blank'
  correctAnswer: string
}

export type ReadingShortQuestion = ReadingQuestionBase & {
  type: 'short'
  correctAnswer: string
}

export type ReadingQuestion = ReadingMcqQuestion | ReadingBlankQuestion | ReadingShortQuestion

export type ReadingSet = {
  id: string
  passage: string
  questions: ReadingQuestion[]
}

export type ReadingSubmission = {
  readingSetId: string
  answers: Record<string, string>
  startedAt: number
  submittedAt: number
  proctoring: ProctoringEvent[]
}

export type SpeakingSubmissionMeta = {
  durationSec: number
  startedAt: number
  submittedAt: number
  proctoring: ProctoringEvent[]
}

export type SpeakingTopic = {
  id: string
  prompt: string
}

export type TestSession = {
  id: string
  testType: TestType
  status: TestSessionStatus
  createdAt: number
  updatedAt: number
  failedReason?: string
  writing?: WritingSubmission
  reading?: ReadingSubmission
  speaking?: SpeakingSubmissionMeta
  currentSection?: EnglishSection
}

export type SectionScore = {
  score: number
  maxScore: number
}

export type TestResults = {
  sessionId: string
  testType: TestType
  status: 'grading' | 'completed' | 'failed'
  overall: SectionScore
  writing: SectionScore
  reading: SectionScore
  speaking: SectionScore
  details: {
    readingCorrect: number
    readingTotal: number
    proctoringEvents: number
  }
  updatedAt: number
}

