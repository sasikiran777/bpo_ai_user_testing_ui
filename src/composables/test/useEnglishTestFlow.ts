import { computed, reactive, ref, watch } from "vue";
import { testsApi } from "@/apis/test/tests.api";
import { useProctoring } from "@/composables/test/useProctoring";
import { useSectionTimer } from "@/composables/test/useSectionTimer";
import type { EnglishSection, ReadingSet, SpeakingTopic, TestSession, TestType, WritingTopic } from "@/types/test/test.types";
import { deriveUserTestState } from "@/utils/userTestStatus";

type Phase = "intro" | EnglishSection | "results";
type WritingQuestionKey = "response";
type SectionWithAudio = "speaking" | "readAloud";
type TestPhase = Exclude<Phase, "intro" | "results">;

const mappingKey = (testId: string) => `bpo_user_test_mapping_id:${testId}`;
const sectionsKey = (testId: string) => `bpo_test_sections:${testId}`;
const orderedPhases: TestPhase[] = ["writing", "reading", "speaking", "readAloud", "emailWriting"];

const readUserTestMappingId = (testId: string) => {
  const raw = sessionStorage.getItem(mappingKey(testId));
  if (!raw || raw === "undefined" || raw === "null") return null;
  return raw;
};

const readSectionId = (testId: string, section: EnglishSection) => {
  const raw = sessionStorage.getItem(sectionsKey(testId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, string | undefined>;
    return parsed[section] ?? null;
  } catch {
    return null;
  }
};

export const useEnglishTestFlow = (testType: TestType, testId: string) => {
  const loading = ref(true);
  const error = ref<string | null>(null);

  const session = ref<TestSession | null>(null);
  const instructions = ref<{ title: string; bullets: string[] } | null>(null);
  const readingSet = ref<ReadingSet | null>(null);
  const speakingTopic = ref<SpeakingTopic | null>(null);
  const readAloudTopic = ref<SpeakingTopic | null>(null);
  const emailWritingTopic = ref<WritingTopic | null>(null);

  const phase = ref<Phase>("intro");

  const writingValues = reactive({
    response: "",
  });

  const writingTyping = reactive({
    response: { firstTs: 0, lastTs: 0, lastLen: 0, addedChars: 0, activeMs: 0 },
  });

  const resetWritingTyping = () => {
    for (const v of Object.values(writingTyping)) {
      v.firstTs = 0;
      v.lastTs = 0;
      v.lastLen = 0;
      v.addedChars = 0;
      v.activeMs = 0;
    }
  };

  const recordWritingTyping = (key: WritingQuestionKey, value: string, nowTs = Date.now()) => {
    const s = writingTyping[key];
    const len = value.length;
    if (!s.firstTs) s.firstTs = nowTs;
    if (s.lastTs) {
      const dt = nowTs - s.lastTs;
      if (dt > 0 && dt < 5000) s.activeMs += dt;
      const delta = len - s.lastLen;
      if (delta > 0) s.addedChars += delta;
    }
    s.lastTs = nowTs;
    s.lastLen = len;
  };

  const calcWpm = (s: {
    firstTs: number;
    lastTs: number;
    addedChars: number;
    activeMs: number;
  }) => {
    const ms = s.activeMs > 0 ? s.activeMs : Math.max(1, s.lastTs - s.firstTs);
    if (!ms || s.addedChars <= 0) return 0;
    return s.addedChars / 5 / (ms / 60000);
  };

  const buildWritingTestNotes = (labels: string[]) => {
    const entries: Array<{ label: string; wpm: number }> = [
      { label: labels[0] ?? "Tell us about yourself", wpm: calcWpm(writingTyping.response) },
    ];

    const totalChars = writingTyping.response.addedChars;
    const totalMs = writingTyping.response.activeMs;

    const typedFields = Object.values(writingTyping).filter((v) => v.addedChars > 0 && v.firstTs && v.lastTs);
    const minFirst = typedFields.length ? Math.min(...typedFields.map((v) => v.firstTs)) : 0;
    const maxLast = typedFields.length ? Math.max(...typedFields.map((v) => v.lastTs)) : 0;
    const fallbackMs = Math.max(1, maxLast - minFirst);
    const effectiveMs = totalMs > 0 ? totalMs : fallbackMs;
    const avgWpm = totalChars > 0 ? totalChars / 5 / (effectiveMs / 60000) : 0;

    const notes: string[] = [`Avg typing speed: ${avgWpm.toFixed(1)} wpm`];
    for (const e of entries) notes.push(`${e.label}: ${e.wpm.toFixed(1)} wpm`);
    return notes;
  };

  const readingAnswers = reactive<Record<string, string>>({});
  const emailWritingValue = ref("");

  const writingStartedAt = ref<number | null>(null);
  const readingStartedAt = ref<number | null>(null);
  const speakingStartedAt = ref<number | null>(null);
  const readAloudStartedAt = ref<number | null>(null);
  const emailWritingStartedAt = ref<number | null>(null);

  const writingMaxTimeMin = ref(5);
  const readingMaxTimeMin = ref(5);
  const speakingMaxTimeMin = ref(3);
  const readAloudMaxTimeMin = ref(1.5);
  const emailWritingMaxTimeMin = ref(5);

  const clampMaxTimeMin = (value: unknown, fallback: number) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback;
    return value;
  };

  const writingDurationSec = computed(() => Math.ceil(clampMaxTimeMin(writingMaxTimeMin.value, 5) * 60));
  const readingDurationSec = computed(() => Math.ceil(clampMaxTimeMin(readingMaxTimeMin.value, 5) * 60));
  const speakingDurationSec = computed(() => Math.ceil(clampMaxTimeMin(speakingMaxTimeMin.value, 3) * 60));
  const readAloudDurationSec = computed(() => Math.ceil(clampMaxTimeMin(readAloudMaxTimeMin.value, 1.5) * 60));
  const emailWritingDurationSec = computed(() => Math.ceil(clampMaxTimeMin(emailWritingMaxTimeMin.value, 5) * 60));

  const proctoring = useProctoring();

  const loadReadingSet = async () => {
    if (readingSet.value) return readingSet.value;
    const sectionId = readSectionId(testId, "reading");
    if (!sectionId) throw new Error("Missing reading section id");
    readingSet.value = await testsApi.getReadingBySection(sectionId);
    return readingSet.value!;
  };

  const loadSpeakingTopic = async () => {
    if (speakingTopic.value) return speakingTopic.value;
    const sectionId = readSectionId(testId, "speaking");
    if (!sectionId) throw new Error("Missing speaking section id");
    speakingTopic.value = await testsApi.getSpeakingTopicBySection(sectionId);
    return speakingTopic.value!;
  };

  const loadReadAloudTopic = async () => {
    if (readAloudTopic.value) return readAloudTopic.value;
    const sectionId = readSectionId(testId, "readAloud");
    if (!sectionId) throw new Error("Missing Read Aloud section id");
    readAloudTopic.value = await testsApi.getSpeakingTopicBySection(sectionId);
    return readAloudTopic.value!;
  };

  const loadEmailWritingTopic = async () => {
    if (emailWritingTopic.value) return emailWritingTopic.value;
    const sectionId = readSectionId(testId, "emailWriting");
    if (!sectionId) throw new Error("Missing Email Writing section id");
    emailWritingTopic.value = await testsApi.getWritingTopicBySection(sectionId);
    return emailWritingTopic.value!;
  };

  const getAvailablePhases = () =>
    orderedPhases.filter((entry) => entry === "writing" || !!readSectionId(testId, entry));

  const getNextPhase = (current: TestPhase): TestPhase | null => {
    const available = getAvailablePhases();
    const index = available.indexOf(current);
    if (index === -1) return null;
    return available[index + 1] ?? null;
  };

  const canTakeTest = computed(() => {
    const s = session.value;
    if (!s) return false;
    return s.status === "not_started" || s.status === "in_progress";
  });

  const isLocked = computed(() => {
    const s = session.value;
    if (!s) return false;
    return s.status === "completed" || s.status === "grading" || s.status === "failed";
  });

  const activeTimerLabel = computed(() => {
    if (phase.value === "writing") return "Writing";
    if (phase.value === "reading") return "Reading";
    if (phase.value === "speaking") return "Speaking";
    if (phase.value === "readAloud") return "Read Aloud";
    if (phase.value === "emailWriting") return "Email Writing";
    return null;
  });

  const setSessionStatusFromBackend = (status: unknown) => {
    const s = deriveUserTestState({ status });
    if (!session.value) {
      session.value = {
        id: readUserTestMappingId(testId) ?? `sess_${Date.now()}`,
        testType,
        status: "not_started",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    if (s === "in_gradding") session.value.status = "grading";
    else if (s === "graded") session.value.status = "completed";
    else if (s === "failed") session.value.status = "failed";
    else session.value.status = "not_started";
    session.value.updatedAt = Date.now();
  };

  const completeTest = () => {
    if (!session.value) return;
    writingTimer.stop();
    readingTimer.stop();
    speakingTimer.stop();
    readAloudTimer.stop();
    emailWritingTimer.stop();
    proctoring.reset();
    proctoring.stop();
    session.value.status = "grading";
    session.value.updatedAt = Date.now();
    phase.value = "results";
  };

  const enterPhase = async (nextPhase: TestPhase) => {
    if (!session.value) return;

    session.value.currentSection = nextPhase;
    session.value.updatedAt = Date.now();
    phase.value = nextPhase;

    if (nextPhase === "writing") {
      writingStartedAt.value = null;
      resetWritingTyping();
      return;
    }

    if (nextPhase === "reading") {
      readingStartedAt.value = null;
      await loadReadingSet();
      return;
    }

    if (nextPhase === "speaking") {
      speakingStartedAt.value = null;
      await loadSpeakingTopic();
      return;
    }

    if (nextPhase === "readAloud") {
      readAloudStartedAt.value = null;
      await loadReadAloudTopic();
      return;
    }

    emailWritingStartedAt.value = null;
    await loadEmailWritingTopic();
  };

  const advancePhase = async (current: TestPhase) => {
    const next = getNextPhase(current);
    if (!next) {
      completeTest();
      return;
    }
    await enterPhase(next);
  };

  const submitWritingInternal = async (auto: boolean) => {
    const s = session.value;
    if (!s || s.status !== "in_progress" || phase.value !== "writing") return;

    const userTestMappingId = readUserTestMappingId(testId);
    const sectionId = readSectionId(testId, "writing");
    if (userTestMappingId && sectionId) {
      const questions = [
        "Tell us about yourself, including your name, where you are from, and your work experience.",
      ];
      const answers = [writingValues.response];
      await testsApi.saveAnswers({
        user_test_mapping_id: userTestMappingId,
        questions,
        answers,
        section_id: sectionId,
        changed_windows_count: proctoring.changedWindowsCount.value,
        test_notes: buildWritingTestNotes(questions),
      });
    }

    proctoring.reset();
    writingTimer.stop();
    await advancePhase("writing");
    if (auto) return;
  };

  const submitReadingInternal = async (_auto: boolean) => {
    const s = session.value;
    if (!s || s.status !== "in_progress" || phase.value !== "reading") return;
    const rs = await loadReadingSet();

    const userTestMappingId = readUserTestMappingId(testId);
    const sectionId = readSectionId(testId, "reading");
    if (userTestMappingId && sectionId) {
      const questions = rs.questions.map((q) => q.prompt);
      const answers = rs.questions.map((q) => readingAnswers[q.id] ?? "");
      await testsApi.saveAnswers({
        user_test_mapping_id: userTestMappingId,
        questions,
        answers,
        section_id: sectionId,
        changed_windows_count: proctoring.changedWindowsCount.value,
        test_notes: [rs.passage],
      });
    }
    proctoring.reset();
    readingTimer.stop();
    await advancePhase("reading");
  };

  const submitAudioSectionInternal = async (
    section: SectionWithAudio,
    audio: Blob,
    _startedAt: number,
    auto: boolean,
  ) => {
    const s = session.value;
    if (!s || s.status !== "in_progress" || phase.value !== section) return;

    const userTestMappingId = readUserTestMappingId(testId);
    const sectionId = readSectionId(testId, section);
    const question =
      (section === "speaking" ? speakingTopic.value?.prompt : readAloudTopic.value?.prompt) ??
      (section === "speaking" ? "Speaking" : "Read Aloud");
    if (!userTestMappingId || !sectionId) {
      throw new Error("Missing user_test_mapping_id or section_id for audio submission");
    }
    await testsApi.saveAudioAnswer({
      user_test_mapping_id: userTestMappingId,
      section_id: sectionId,
      question,
      changed_windows_count: proctoring.changedWindowsCount.value,
      audio,
      test_notes: [question],
    });
    if (section === "speaking") speakingTimer.stop();
    else readAloudTimer.stop();
    proctoring.reset();
    await advancePhase(section);
    if (auto) return;
  };

  const submitEmailWritingInternal = async (auto: boolean) => {
    const s = session.value;
    if (!s || s.status !== "in_progress" || phase.value !== "emailWriting") return;

    const userTestMappingId = readUserTestMappingId(testId);
    const sectionId = readSectionId(testId, "emailWriting");
    const prompt = (await loadEmailWritingTopic()).prompt;

    if (userTestMappingId && sectionId) {
      await testsApi.saveAnswers({
        user_test_mapping_id: userTestMappingId,
        questions: [prompt],
        answers: [emailWritingValue.value],
        section_id: sectionId,
        changed_windows_count: proctoring.changedWindowsCount.value,
        test_notes: [
          "Recommended structure: subject, greeting, body, closing",
          "Scoring focus: task relevance, clarity, organization, tone, grammar, spelling",
        ],
      });
    }

    emailWritingTimer.stop();
    completeTest();
    if (auto) return;
  };

  const writingTimer = useSectionTimer(writingDurationSec, () => {
    if (phase.value !== "writing") return;
    void submitWritingInternal(true);
  });

  const readingTimer = useSectionTimer(readingDurationSec, () => {
    if (phase.value !== "reading") return;
    void submitReadingInternal(true);
  });

  const speakingTimer = useSectionTimer(speakingDurationSec);
  const readAloudTimer = useSectionTimer(readAloudDurationSec);
  const emailWritingTimer = useSectionTimer(emailWritingDurationSec, () => {
    if (phase.value !== "emailWriting") return;
    void submitEmailWritingInternal(true);
  });

  const init = async () => {
    loading.value = true;
    error.value = null;
    try {
      const tests = await testsApi.myTests();
      const t = tests.find((x) => x.id === testId);
      setSessionStatusFromBackend(t?.status);
      for (const s of t?.sections ?? []) {
        const n = s.name.trim().toLowerCase();
        if (n === "write") writingMaxTimeMin.value = clampMaxTimeMin(s.max_time, writingMaxTimeMin.value);
        else if (n === "read") readingMaxTimeMin.value = clampMaxTimeMin(s.max_time, readingMaxTimeMin.value);
        else if (n === "speak") speakingMaxTimeMin.value = clampMaxTimeMin(s.max_time, speakingMaxTimeMin.value);
        else if (n === "read aloud") readAloudMaxTimeMin.value = clampMaxTimeMin(s.max_time, readAloudMaxTimeMin.value);
        else if (n === "email writing") emailWritingMaxTimeMin.value = clampMaxTimeMin(s.max_time, emailWritingMaxTimeMin.value);
      }
      phase.value =
        session.value?.status === "grading" ||
        session.value?.status === "completed" ||
        session.value?.status === "failed"
          ? "results"
          : "intro";
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load test";
    } finally {
      loading.value = false;
    }
  };

  const start = async () => {
    session.value = {
      id: readUserTestMappingId(testId) ?? `sess_${Date.now()}`,
      testType,
      status: "in_progress",
      currentSection: "writing",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    proctoring.reset();
    proctoring.start();
    await enterPhase(getAvailablePhases()[0] ?? "writing");
  };

  const abandon = async (reason: string) => {
    if (!session.value) {
      session.value = {
        id: readUserTestMappingId(testId) ?? `sess_${Date.now()}`,
        testType,
        status: "failed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        failedReason: reason,
      };
    } else {
      session.value.status = "failed";
      session.value.failedReason = reason;
      session.value.updatedAt = Date.now();
    }
    proctoring.stop();
    writingTimer.stop();
    readingTimer.stop();
    speakingTimer.stop();
    readAloudTimer.stop();
    emailWritingTimer.stop();
    phase.value = "results";
  };

  const submitWriting = async () => submitWritingInternal(false);
  const submitReading = async () => submitReadingInternal(false);

  const startWriting = async () => {
    if (!writingStartedAt.value) {
      writingStartedAt.value = Date.now();
      writingTimer.start();
    }
  };

  const startReading = async () => {
    if (!readingStartedAt.value) {
      readingStartedAt.value = Date.now();
      readingTimer.start();
    }
  };

  const startSpeaking = async () => {
    await loadSpeakingTopic();
    speakingStartedAt.value = Date.now();
    speakingTimer.start();
  };

  const startReadAloud = async () => {
    await loadReadAloudTopic();
    if (!readAloudStartedAt.value) {
      readAloudStartedAt.value = Date.now();
      readAloudTimer.start();
    }
  };

  const startEmailWriting = async () => {
    await loadEmailWritingTopic();
    if (!emailWritingStartedAt.value) {
      emailWritingStartedAt.value = Date.now();
      emailWritingTimer.start();
    }
  };

  const submitSpeaking = async (audio: Blob) => {
    const startedAt = speakingStartedAt.value ?? Date.now();
    await submitAudioSectionInternal("speaking", audio, startedAt, false);
  };

  const finalizeSpeakingAuto = async (audio: Blob, startedAt: number) =>
    submitAudioSectionInternal("speaking", audio, startedAt, true);

  const submitReadAloud = async (audio: Blob) => {
    const startedAt = readAloudStartedAt.value ?? Date.now();
    await submitAudioSectionInternal("readAloud", audio, startedAt, false);
  };

  const finalizeReadAloudAuto = async (audio: Blob, startedAt: number) =>
    submitAudioSectionInternal("readAloud", audio, startedAt, true);

  const submitEmailWriting = async () => submitEmailWritingInternal(false);

  watch(
    () => writingValues.response,
    (v) => recordWritingTyping("response", v),
  );

  return {
    loading,
    error,
    session,
    instructions,
    readingSet,
    speakingTopic,
    readAloudTopic,
    emailWritingTopic,
    phase,
    writingValues,
    readingAnswers,
    emailWritingValue,
    canTakeTest,
    isLocked,
    proctoring,
    writingTimer,
    readingTimer,
    speakingTimer,
    readAloudTimer,
    emailWritingTimer,
    activeTimerLabel,
    writingMaxTimeMin,
    readingMaxTimeMin,
    speakingMaxTimeMin,
    readAloudMaxTimeMin,
    emailWritingMaxTimeMin,
    init,
    start,
    abandon,
    submitWriting,
    submitReading,
    startWriting,
    startReading,
    startSpeaking,
    submitSpeaking,
    finalizeSpeakingAuto,
    startReadAloud,
    submitReadAloud,
    finalizeReadAloudAuto,
    submitEmailWriting,
    writingStartedAt,
    readingStartedAt,
    speakingStartedAt,
    readAloudStartedAt,
    emailWritingStartedAt,
    startEmailWriting,
  };
};
