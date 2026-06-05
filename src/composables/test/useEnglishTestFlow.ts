import { computed, reactive, ref, watch } from "vue";
import { testApi } from "@/apis/test/test.api";
import { testsApi } from "@/apis/test/tests.api";
import { useProctoring } from "@/composables/test/useProctoring";
import { useSectionTimer } from "@/composables/test/useSectionTimer";
import type { ReadingSet, SpeakingTopic, TestSession, TestType } from "@/types/test/test.types";

type Phase = "intro" | "writing" | "reading" | "speaking" | "results";

const mappingKey = (testId: string) => `bpo_user_test_mapping_id:${testId}`;
const sectionsKey = (testId: string) => `bpo_test_sections:${testId}`;

const readUserTestMappingId = (testId: string) => {
  const raw = sessionStorage.getItem(mappingKey(testId));
  if (!raw || raw === "undefined" || raw === "null") return null;
  return raw;
};

const readSectionId = (testId: string, section: "writing" | "reading" | "speaking") => {
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

  const phase = ref<Phase>("intro");

  const writingValues = reactive({
    aboutMe: "",
    location: "",
    experience: "",
    roles: "",
    responsibilities: "",
    other: "",
  });

  const writingTyping = reactive({
    aboutMe: { firstTs: 0, lastTs: 0, lastLen: 0, addedChars: 0, activeMs: 0 },
    location: { firstTs: 0, lastTs: 0, lastLen: 0, addedChars: 0, activeMs: 0 },
    experience: { firstTs: 0, lastTs: 0, lastLen: 0, addedChars: 0, activeMs: 0 },
    roles: { firstTs: 0, lastTs: 0, lastLen: 0, addedChars: 0, activeMs: 0 },
    responsibilities: { firstTs: 0, lastTs: 0, lastLen: 0, addedChars: 0, activeMs: 0 },
    other: { firstTs: 0, lastTs: 0, lastLen: 0, addedChars: 0, activeMs: 0 },
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

  const recordWritingTyping = (
    key: keyof typeof writingTyping,
    value: string,
    nowTs = Date.now(),
  ) => {
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
      { label: labels[0] ?? "Tell us about yourself", wpm: calcWpm(writingTyping.aboutMe) },
      { label: labels[1] ?? "Where are you from?", wpm: calcWpm(writingTyping.location) },
      { label: labels[2] ?? "Experience summary", wpm: calcWpm(writingTyping.experience) },
      { label: labels[3] ?? "Roles you worked in", wpm: calcWpm(writingTyping.roles) },
      { label: labels[4] ?? "Responsibilities", wpm: calcWpm(writingTyping.responsibilities) },
      { label: labels[5] ?? "Anything else?", wpm: calcWpm(writingTyping.other) },
    ];

    const totalChars =
      writingTyping.aboutMe.addedChars +
      writingTyping.location.addedChars +
      writingTyping.experience.addedChars +
      writingTyping.roles.addedChars +
      writingTyping.responsibilities.addedChars +
      writingTyping.other.addedChars;

    const totalMs =
      writingTyping.aboutMe.activeMs +
      writingTyping.location.activeMs +
      writingTyping.experience.activeMs +
      writingTyping.roles.activeMs +
      writingTyping.responsibilities.activeMs +
      writingTyping.other.activeMs;

    const typedFields = Object.values(writingTyping).filter(
      (v) => v.addedChars > 0 && v.firstTs && v.lastTs,
    );
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

  const writingStartedAt = ref<number | null>(null);
  const readingStartedAt = ref<number | null>(null);
  const speakingStartedAt = ref<number | null>(null);

  const proctoring = useProctoring();

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
    return null;
  });

  const computePhaseFromSession = (s: TestSession): Phase => {
    if (s.status === "not_started") return "intro";
    if (s.status === "grading" || s.status === "completed" || s.status === "failed")
      return "results";
    if (!s.writing) return "writing";
    if (!s.reading) return "reading";
    if (!s.speaking) return "speaking";
    return "results";
  };

  const submitWritingInternal = async (auto: boolean) => {
    const s = session.value;
    if (!s || s.status !== "in_progress" || s.writing) return;
    const startedAt = writingStartedAt.value ?? Date.now();
    const submittedAt = Date.now();

    const userTestMappingId = readUserTestMappingId(testId);
    const sectionId = readSectionId(testId, "writing");
    if (userTestMappingId && sectionId) {
      const questions = [
        "Tell us about yourself",
        "Where are you from?",
        "Experience summary",
        "Roles you worked in",
        "Responsibilities",
        "Anything else?",
      ];
      const answers = [
        writingValues.aboutMe,
        writingValues.location,
        writingValues.experience,
        writingValues.roles,
        writingValues.responsibilities,
        writingValues.other,
      ];
      await testsApi.saveAnswers({
        user_test_mapping_id: userTestMappingId,
        questions,
        answers,
        section_id: sectionId,
        changed_windows_count: proctoring.changedWindowsCount.value,
        test_notes: buildWritingTestNotes(questions),
      });
    }

    const next = await testApi.submitWriting(testType, {
      ...writingValues,
      startedAt,
      submittedAt,
      proctoring: [...proctoring.events.value],
    });
    session.value = next;
    proctoring.reset();
    writingTimer.stop();
    if (next.writing && !next.reading) phase.value = "reading";
    readingStartedAt.value = Date.now();
    if (!readingSet.value) readingSet.value = await testApi.getReadingSet(testType);
    readingTimer.start();
    if (auto) return;
  };

  const submitReadingInternal = async (auto: boolean) => {
    const s = session.value;
    if (!s || s.status !== "in_progress" || !s.writing || s.reading) return;
    if (!readingSet.value) readingSet.value = await testApi.getReadingSet(testType);
    const startedAt = readingStartedAt.value ?? Date.now();
    const submittedAt = Date.now();

    const userTestMappingId = readUserTestMappingId(testId);
    const sectionId = readSectionId(testId, "reading");
    if (userTestMappingId && sectionId && readingSet.value) {
      const questions = readingSet.value.questions.map((q) => q.prompt);
      const answers = readingSet.value.questions.map((q) => readingAnswers[q.id] ?? "");
      await testsApi.saveAnswers({
        user_test_mapping_id: userTestMappingId,
        questions,
        answers,
        section_id: sectionId,
        changed_windows_count: proctoring.changedWindowsCount.value,
        test_notes: [readingSet.value.passage],
      });
    }

    const next = await testApi.submitReading(testType, {
      readingSetId: readingSet.value.id,
      answers: { ...readingAnswers },
      startedAt,
      submittedAt,
      proctoring: [...proctoring.events.value],
    });
    session.value = next;
    proctoring.reset();
    readingTimer.stop();
    if (next.reading && !next.speaking) phase.value = "speaking";
    speakingStartedAt.value = null;
    if (!speakingTopic.value) speakingTopic.value = await testApi.getSpeakingTopic(testType);
  };

  const submitSpeakingInternal = async (audio: Blob, startedAt: number, auto: boolean) => {
    const s = session.value;
    if (!s || s.status !== "in_progress" || !s.writing || !s.reading || s.speaking) return;
    const submittedAt = Date.now();

    const userTestMappingId = readUserTestMappingId(testId);
    const sectionId = readSectionId(testId, "speaking");
    const question = speakingTopic.value?.prompt ?? "Speaking";
    if (!userTestMappingId || !sectionId) {
      throw new Error("Missing user_test_mapping_id or section_id for speaking submission");
    }
    await testsApi.saveAudioAnswer({
      user_test_mapping_id: userTestMappingId,
      section_id: sectionId,
      question,
      changed_windows_count: proctoring.changedWindowsCount.value,
      audio,
      test_notes: [question],
    });

    await testApi.submitSpeaking(testType, audio, {
      durationSec: 180,
      startedAt,
      submittedAt,
      proctoring: [...proctoring.events.value],
    });
    proctoring.reset();
    speakingTimer.stop();
    const next = await testApi.submitTest(testType);
    session.value = next;
    proctoring.stop();
    phase.value = "results";
    if (auto) return;
  };

  const writingTimer = useSectionTimer(300, () => {
    if (phase.value !== "writing") return;
    void submitWritingInternal(true);
  });

  const readingTimer = useSectionTimer(300, () => {
    if (phase.value !== "reading") return;
    void submitReadingInternal(true);
  });

  const speakingTimer = useSectionTimer(180);

  const init = async () => {
    loading.value = true;
    error.value = null;
    try {
      const [s, i] = await Promise.all([
        testApi.getOrCreateSession(testType),
        testApi.getInstructions(testType),
      ]);
      session.value = s;
      instructions.value = i;
      phase.value = computePhaseFromSession(s);
      if (s.status === "not_started") {
        sessionStorage.removeItem(mappingKey(testId));
      }

      if (s.writing) {
        writingValues.aboutMe = s.writing.aboutMe;
        writingValues.location = s.writing.location;
        writingValues.experience = s.writing.experience;
        writingValues.roles = s.writing.roles;
        writingValues.responsibilities = s.writing.responsibilities;
        writingValues.other = s.writing.other;
      }

      if (s.reading) {
        Object.assign(readingAnswers, s.reading.answers);
      }

      if (s.status === "in_progress") {
        proctoring.start();
        if (phase.value === "writing") {
          writingStartedAt.value = Date.now();
          writingTimer.start();
        }
        if (phase.value === "reading") {
          readingSet.value = await testApi.getReadingSet(testType);
          readingStartedAt.value = Date.now();
          readingTimer.start();
        }
        if (phase.value === "speaking") {
          speakingTopic.value = await testApi.getSpeakingTopic(testType);
        }
        if (phase.value === "results") {
          session.value = await testApi.submitTest(testType);
          proctoring.stop();
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load test";
    } finally {
      loading.value = false;
    }
  };

  const start = async () => {
    const s = await testApi.startSession(testType);
    session.value = s;
    proctoring.reset();
    proctoring.start();
    phase.value = computePhaseFromSession(s);
    writingStartedAt.value = Date.now();
    resetWritingTyping();
    writingTimer.start();
  };

  const abandon = async (reason: string) => {
    session.value = await testApi.markAttemptFailed(testType, reason);
    proctoring.stop();
    writingTimer.stop();
    readingTimer.stop();
    speakingTimer.stop();
    phase.value = "results";
  };

  const submitWriting = async () => submitWritingInternal(false);
  const submitReading = async () => submitReadingInternal(false);

  const startSpeaking = async () => {
    if (!speakingTopic.value) speakingTopic.value = await testApi.getSpeakingTopic(testType);
    speakingStartedAt.value = Date.now();
    speakingTimer.start();
  };

  const submitSpeaking = async (audio: Blob) => {
    const startedAt = speakingStartedAt.value ?? Date.now();
    await submitSpeakingInternal(audio, startedAt, false);
  };

  const finalizeSpeakingAuto = async (audio: Blob, startedAt: number) =>
    submitSpeakingInternal(audio, startedAt, true);

  watch(
    () => writingValues.aboutMe,
    (v) => recordWritingTyping("aboutMe", v),
  );
  watch(
    () => writingValues.location,
    (v) => recordWritingTyping("location", v),
  );
  watch(
    () => writingValues.experience,
    (v) => recordWritingTyping("experience", v),
  );
  watch(
    () => writingValues.roles,
    (v) => recordWritingTyping("roles", v),
  );
  watch(
    () => writingValues.responsibilities,
    (v) => recordWritingTyping("responsibilities", v),
  );
  watch(
    () => writingValues.other,
    (v) => recordWritingTyping("other", v),
  );

  return {
    loading,
    error,
    session,
    instructions,
    readingSet,
    speakingTopic,
    phase,
    writingValues,
    readingAnswers,
    canTakeTest,
    isLocked,
    proctoring,
    writingTimer,
    readingTimer,
    speakingTimer,
    activeTimerLabel,
    init,
    start,
    abandon,
    submitWriting,
    submitReading,
    startSpeaking,
    submitSpeaking,
    finalizeSpeakingAuto,
    speakingStartedAt,
  };
};
