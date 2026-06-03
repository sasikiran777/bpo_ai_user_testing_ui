import { idbAudio } from "@/utils/idb";
import type {
  ProctoringEvent,
  ReadingSet,
  SpeakingTopic,
  TestResults,
  TestSession,
  TestType,
  WritingSubmission,
  ReadingSubmission,
  SpeakingSubmissionMeta,
} from "@/types/test/test.types";

const getAuthKey = () =>
  localStorage.getItem("auth_token") ?? sessionStorage.getItem("auth_token") ?? "anon";

const sessionKey = (testType: TestType) => `bpo_test_session:${getAuthKey()}:${testType}`;
const resultsKey = (testType: TestType) => `bpo_test_results:${getAuthKey()}:${testType}`;
const gradingKey = (testType: TestType) => `bpo_test_grading_ready_at:${getAuthKey()}:${testType}`;

const now = () => Date.now();

const readJson = <T>(key: string): T | null => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const randomId = () => Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);

const defaultReadingSet: ReadingSet = {
  id: "reading-1",
  passage:
    "BPO Solutions Group helps organizations improve customer experience by providing skilled teams and modern tools. Their AI user testing platform measures real-world skills through structured assessments and clear reporting.",
  questions: [
    {
      id: "q1",
      type: "mcq",
      prompt: "What does BPO Solutions Group help organizations improve?",
      options: ["Customer experience", "Office rent", "Weather forecasting", "Shipping costs"],
      correctAnswer: "Customer experience",
    },
    {
      id: "q2",
      type: "blank",
      prompt: "The platform measures real-world skills through structured _____.",
      correctAnswer: "assessments",
    },
    {
      id: "q3",
      type: "short",
      prompt: "Name one thing the platform provides after assessments.",
      correctAnswer: "reporting",
    },
  ],
};

const defaultSpeakingTopic: SpeakingTopic = {
  id: "topic-1",
  prompt: "Talk about a challenge you faced at work and how you solved it.",
};

const computeResults = (testType: TestType, session: TestSession): TestResults => {
  const writingWords =
    (session.writing?.aboutMe ?? "").trim().split(/\s+/).filter(Boolean).length ?? 0;
  const writing = { score: Math.min(20, Math.floor(writingWords / 10)), maxScore: 20 };

  const readingSet = defaultReadingSet;
  const answers = session.reading?.answers ?? {};
  const readingCorrect = readingSet.questions.reduce((acc, q) => {
    const a = (answers[q.id] ?? "").trim().toLowerCase();
    const c = q.correctAnswer.trim().toLowerCase();
    if (!a) return acc;
    if (q.type === "short") return a.includes(c) ? acc + 1 : acc;
    return a === c ? acc + 1 : acc;
  }, 0);
  const readingTotal = readingSet.questions.length;
  const reading = { score: readingCorrect, maxScore: readingTotal };

  const speaking = session.speaking ? { score: 8, maxScore: 10 } : { score: 0, maxScore: 10 };

  const overallMax = writing.maxScore + reading.maxScore + speaking.maxScore;
  const overallScore = writing.score + reading.score + speaking.score;

  const proctoringEvents =
    (session.writing?.proctoring.length ?? 0) +
    (session.reading?.proctoring.length ?? 0) +
    (session.speaking?.proctoring.length ?? 0);

  return {
    sessionId: session.id,
    testType,
    status:
      session.status === "failed"
        ? "failed"
        : session.status === "completed"
          ? "completed"
          : "grading",
    overall: { score: overallScore, maxScore: overallMax },
    writing,
    reading,
    speaking,
    details: {
      readingCorrect,
      readingTotal,
      proctoringEvents,
    },
    updatedAt: now(),
  };
};

export const testApi = {
  async getOrCreateSession(testType: TestType): Promise<TestSession> {
    const existing = readJson<TestSession>(sessionKey(testType));
    if (existing) return existing;

    const created: TestSession = {
      id: `sess_${randomId()}`,
      testType,
      status: "not_started",
      createdAt: now(),
      updatedAt: now(),
    };
    writeJson(sessionKey(testType), created);
    return created;
  },

  async startSession(testType: TestType): Promise<TestSession> {
    const s = await this.getOrCreateSession(testType);
    if (s.status !== "not_started") return s;
    const next: TestSession = {
      ...s,
      status: "in_progress",
      currentSection: "writing",
      updatedAt: now(),
    };
    writeJson(sessionKey(testType), next);
    return next;
  },

  async getInstructions(testType: TestType): Promise<{ title: string; bullets: string[] }> {
    if (testType === "english") {
      return {
        title: "English Skills Test",
        bullets: [
          "You can take this test only once.",
          "Do not refresh/close the tab or switch away. Leaving the test may mark it as failed.",
          "Writing: 5 minutes. Reading: 5 minutes. Speaking: 3 minutes (auto-recording).",
          "Microphone access is required for the Speaking section.",
          "Your activity (tab changes / focus loss) is tracked silently during the test.",
        ],
      };
    }
    return { title: "Test", bullets: [] };
  },

  async getReadingSet(testType: TestType): Promise<ReadingSet> {
    if (testType === "english") return defaultReadingSet;
    return defaultReadingSet;
  },

  async getSpeakingTopic(testType: TestType): Promise<SpeakingTopic> {
    if (testType === "english") return defaultSpeakingTopic;
    return defaultSpeakingTopic;
  },

  async submitWriting(
    testType: TestType,
    payload: Omit<WritingSubmission, "proctoring"> & { proctoring: ProctoringEvent[] },
  ): Promise<TestSession> {
    const s = await this.getOrCreateSession(testType);
    if (s.status !== "in_progress" || s.writing) return s;
    const next: TestSession = {
      ...s,
      writing: payload,
      currentSection: "reading",
      updatedAt: now(),
    };
    writeJson(sessionKey(testType), next);
    return next;
  },

  async submitReading(
    testType: TestType,
    payload: Omit<ReadingSubmission, "proctoring"> & { proctoring: ProctoringEvent[] },
  ): Promise<TestSession> {
    const s = await this.getOrCreateSession(testType);
    if (s.status !== "in_progress" || !s.writing || s.reading) return s;
    const next: TestSession = {
      ...s,
      reading: payload,
      currentSection: "speaking",
      updatedAt: now(),
    };
    writeJson(sessionKey(testType), next);
    return next;
  },

  async submitSpeaking(
    testType: TestType,
    audio: Blob,
    meta: Omit<SpeakingSubmissionMeta, "proctoring"> & { proctoring: ProctoringEvent[] },
  ): Promise<TestSession> {
    const s = await this.getOrCreateSession(testType);
    if (s.status !== "in_progress" || !s.writing || !s.reading || s.speaking) return s;
    await idbAudio.set(`${getAuthKey()}:${testType}:${s.id}`, audio);
    const next: TestSession = { ...s, speaking: meta, updatedAt: now() };
    writeJson(sessionKey(testType), next);
    return next;
  },

  async submitTest(testType: TestType): Promise<TestSession> {
    const s = await this.getOrCreateSession(testType);
    if (s.status === "failed" || s.status === "completed" || s.status === "grading") return s;
    if (!s.writing || !s.reading) return s;
    const next: TestSession = { ...s, status: "grading", updatedAt: now() };
    writeJson(sessionKey(testType), next);
    const readyAt = now() + 15000;
    localStorage.setItem(gradingKey(testType), String(readyAt));
    writeJson(resultsKey(testType), computeResults(testType, next));
    return next;
  },

  async markAttemptFailed(testType: TestType, reason: string): Promise<TestSession> {
    const s = await this.getOrCreateSession(testType);
    if (s.status === "completed" || s.status === "failed") return s;
    const next: TestSession = { ...s, status: "failed", failedReason: reason, updatedAt: now() };
    writeJson(sessionKey(testType), next);
    writeJson(resultsKey(testType), computeResults(testType, next));
    return next;
  },

  markAttemptFailedSync(testType: TestType, reason: string) {
    const key = sessionKey(testType);
    const existing = readJson<TestSession>(key);
    const base: TestSession =
      existing ??
      ({
        id: `sess_${randomId()}`,
        testType,
        status: "not_started",
        createdAt: now(),
        updatedAt: now(),
      } as TestSession);

    if (base.status === "completed" || base.status === "failed") return;
    const next: TestSession = { ...base, status: "failed", failedReason: reason, updatedAt: now() };
    writeJson(key, next);
    writeJson(resultsKey(testType), computeResults(testType, next));
  },

  async getResults(testType: TestType): Promise<TestResults> {
    const session = await this.getOrCreateSession(testType);
    if (session.status === "failed") {
      const r = computeResults(testType, session);
      writeJson(resultsKey(testType), r);
      return r;
    }

    const readyAtRaw = localStorage.getItem(gradingKey(testType));
    const readyAt = readyAtRaw ? Number(readyAtRaw) : 0;
    const isReady = Boolean(readyAt) && now() >= readyAt;

    if (session.status === "grading" && isReady) {
      const completed: TestSession = { ...session, status: "completed", updatedAt: now() };
      writeJson(sessionKey(testType), completed);
      const r = computeResults(testType, completed);
      writeJson(resultsKey(testType), r);
      return r;
    }

    const cached = readJson<TestResults>(resultsKey(testType));
    if (cached)
      return { ...cached, status: session.status === "completed" ? "completed" : "grading" };

    const r = computeResults(testType, session);
    writeJson(resultsKey(testType), r);
    return r;
  },

  async getSpeakingAudio(testType: TestType, sessionId: string): Promise<Blob | undefined> {
    return idbAudio.get(`${getAuthKey()}:${testType}:${sessionId}`);
  },
};
