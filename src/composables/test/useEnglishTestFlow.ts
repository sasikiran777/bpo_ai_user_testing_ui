import { computed, reactive, ref } from 'vue'
import { testApi } from '@/apis/test/test.api'
import { testsApi } from '@/apis/test/tests.api'
import { useProctoring } from '@/composables/test/useProctoring'
import { useSectionTimer } from '@/composables/test/useSectionTimer'
import type { ReadingSet, SpeakingTopic, TestSession, TestType } from '@/types/test/test.types'

type Phase = 'intro' | 'writing' | 'reading' | 'speaking' | 'results'

const mappingKey = (testId: string) => `bpo_user_test_mapping_id:${testId}`
const sectionsKey = (testId: string) => `bpo_test_sections:${testId}`

const readSectionId = (testId: string, section: 'writing' | 'reading' | 'speaking') => {
  const raw = sessionStorage.getItem(sectionsKey(testId))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, string | undefined>
    return parsed[section] ?? null
  } catch {
    return null
  }
}

export const useEnglishTestFlow = (testType: TestType, testId: string) => {
  const loading = ref(true)
  const error = ref<string | null>(null)

  const session = ref<TestSession | null>(null)
  const instructions = ref<{ title: string; bullets: string[] } | null>(null)
  const readingSet = ref<ReadingSet | null>(null)
  const speakingTopic = ref<SpeakingTopic | null>(null)

  const phase = ref<Phase>('intro')

  const writingValues = reactive({
    aboutMe: '',
    location: '',
    experience: '',
    roles: '',
    responsibilities: '',
    other: '',
  })

  const readingAnswers = reactive<Record<string, string>>({})

  const writingStartedAt = ref<number | null>(null)
  const readingStartedAt = ref<number | null>(null)
  const speakingStartedAt = ref<number | null>(null)

  const proctoring = useProctoring()

  const canTakeTest = computed(() => {
    const s = session.value
    if (!s) return false
    return s.status === 'not_started' || s.status === 'in_progress'
  })

  const isLocked = computed(() => {
    const s = session.value
    if (!s) return false
    return s.status === 'completed' || s.status === 'grading' || s.status === 'failed'
  })

  const activeTimerLabel = computed(() => {
    if (phase.value === 'writing') return 'Writing'
    if (phase.value === 'reading') return 'Reading'
    if (phase.value === 'speaking') return 'Speaking'
    return null
  })

  const computePhaseFromSession = (s: TestSession): Phase => {
    if (s.status === 'not_started') return 'intro'
    if (s.status === 'grading' || s.status === 'completed' || s.status === 'failed') return 'results'
    if (!s.writing) return 'writing'
    if (!s.reading) return 'reading'
    if (!s.speaking) return 'speaking'
    return 'results'
  }

  const submitWritingInternal = async (auto: boolean) => {
    const s = session.value
    if (!s || s.status !== 'in_progress' || s.writing) return
    const startedAt = writingStartedAt.value ?? Date.now()
    const submittedAt = Date.now()

    const userTestMappingId = sessionStorage.getItem(mappingKey(testId))
    const sectionId = readSectionId(testId, 'writing')
    if (userTestMappingId && sectionId) {
      const questions = [
        'Tell us about yourself',
        'Where are you from?',
        'Experience summary',
        'Roles you worked in',
        'Responsibilities',
        'Anything else?',
      ]
      const answers = [
        writingValues.aboutMe,
        writingValues.location,
        writingValues.experience,
        writingValues.roles,
        writingValues.responsibilities,
        writingValues.other,
      ]
      await testsApi.saveAnswers({
        user_test_mapping_id: userTestMappingId,
        questions,
        answers,
        section_id: sectionId,
        changed_windows_count: proctoring.changedWindowsCount.value,
      })
    }

    const next = await testApi.submitWriting(testType, {
      ...writingValues,
      startedAt,
      submittedAt,
      proctoring: [...proctoring.events.value],
    })
    session.value = next
    proctoring.reset()
    writingTimer.stop()
    if (next.writing && !next.reading) phase.value = 'reading'
    readingStartedAt.value = Date.now()
    if (!readingSet.value) readingSet.value = await testApi.getReadingSet(testType)
    readingTimer.start()
    if (auto) return
  }

  const submitReadingInternal = async (auto: boolean) => {
    const s = session.value
    if (!s || s.status !== 'in_progress' || !s.writing || s.reading) return
    if (!readingSet.value) readingSet.value = await testApi.getReadingSet(testType)
    const startedAt = readingStartedAt.value ?? Date.now()
    const submittedAt = Date.now()

    const userTestMappingId = sessionStorage.getItem(mappingKey(testId))
    const sectionId = readSectionId(testId, 'reading')
    if (userTestMappingId && sectionId && readingSet.value) {
      const questions = readingSet.value.questions.map((q) => q.prompt)
      const answers = readingSet.value.questions.map((q) => readingAnswers[q.id] ?? '')
      await testsApi.saveAnswers({
        user_test_mapping_id: userTestMappingId,
        questions,
        answers,
        section_id: sectionId,
        changed_windows_count: proctoring.changedWindowsCount.value,
      })
    }

    const next = await testApi.submitReading(testType, {
      readingSetId: readingSet.value.id,
      answers: { ...readingAnswers },
      startedAt,
      submittedAt,
      proctoring: [...proctoring.events.value],
    })
    session.value = next
    proctoring.reset()
    readingTimer.stop()
    if (next.reading && !next.speaking) phase.value = 'speaking'
    speakingStartedAt.value = null
    if (!speakingTopic.value) speakingTopic.value = await testApi.getSpeakingTopic(testType)
  }

  const submitSpeakingInternal = async (audio: Blob, startedAt: number, auto: boolean) => {
    const s = session.value
    if (!s || s.status !== 'in_progress' || !s.writing || !s.reading || s.speaking) return
    const submittedAt = Date.now()
    await testApi.submitSpeaking(testType, audio, {
      durationSec: 180,
      startedAt,
      submittedAt,
      proctoring: [...proctoring.events.value],
    })
    proctoring.reset()
    speakingTimer.stop()
    const next = await testApi.submitTest(testType)
    session.value = next
    proctoring.stop()
    phase.value = 'results'
    if (auto) return
  }

  const writingTimer = useSectionTimer(300, () => {
    if (phase.value !== 'writing') return
    void submitWritingInternal(true)
  })

  const readingTimer = useSectionTimer(300, () => {
    if (phase.value !== 'reading') return
    void submitReadingInternal(true)
  })

  const speakingTimer = useSectionTimer(180)

  const init = async () => {
    loading.value = true
    error.value = null
    try {
      const [s, i] = await Promise.all([testApi.getOrCreateSession(testType), testApi.getInstructions(testType)])
      session.value = s
      instructions.value = i
      phase.value = computePhaseFromSession(s)

      if (s.writing) {
        writingValues.aboutMe = s.writing.aboutMe
        writingValues.location = s.writing.location
        writingValues.experience = s.writing.experience
        writingValues.roles = s.writing.roles
        writingValues.responsibilities = s.writing.responsibilities
        writingValues.other = s.writing.other
      }

      if (s.reading) {
        Object.assign(readingAnswers, s.reading.answers)
      }

      if (s.status === 'in_progress') {
        proctoring.start()
        if (phase.value === 'writing') {
          writingStartedAt.value = Date.now()
          writingTimer.start()
        }
        if (phase.value === 'reading') {
          readingSet.value = await testApi.getReadingSet(testType)
          readingStartedAt.value = Date.now()
          readingTimer.start()
        }
        if (phase.value === 'speaking') {
          speakingTopic.value = await testApi.getSpeakingTopic(testType)
        }
        if (phase.value === 'results') {
          session.value = await testApi.submitTest(testType)
          proctoring.stop()
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load test'
    } finally {
      loading.value = false
    }
  }

  const start = async () => {
    const s = await testApi.startSession(testType)
    session.value = s
    proctoring.reset()
    proctoring.start()
    phase.value = computePhaseFromSession(s)
    writingStartedAt.value = Date.now()
    writingTimer.start()
  }

  const abandon = async (reason: string) => {
    session.value = await testApi.markAttemptFailed(testType, reason)
    proctoring.stop()
    writingTimer.stop()
    readingTimer.stop()
    speakingTimer.stop()
    phase.value = 'results'
  }

  const submitWriting = async () => submitWritingInternal(false)
  const submitReading = async () => submitReadingInternal(false)

  const startSpeaking = async () => {
    if (!speakingTopic.value) speakingTopic.value = await testApi.getSpeakingTopic(testType)
    speakingStartedAt.value = Date.now()
    speakingTimer.start()
  }

  const submitSpeaking = async (audio: Blob) => {
    const startedAt = speakingStartedAt.value ?? Date.now()
    await submitSpeakingInternal(audio, startedAt, false)
  }

  const finalizeSpeakingAuto = async (audio: Blob, startedAt: number) => submitSpeakingInternal(audio, startedAt, true)

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
  }
}
