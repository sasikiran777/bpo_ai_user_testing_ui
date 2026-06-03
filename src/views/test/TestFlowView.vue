<script setup lang="ts">
import AppShell from '@/components/modules/app/AppShell.vue'
import InstructionsStep from '@/components/modules/test/InstructionsStep.vue'
import WritingStep from '@/components/modules/test/WritingStep.vue'
import ReadingStep from '@/components/modules/test/ReadingStep.vue'
import SpeakingStep from '@/components/modules/test/SpeakingStep.vue'
import { useAttemptLeaveGuard } from '@/composables/test/useAttemptLeaveGuard'
import { useEnglishTestFlow } from '@/composables/test/useEnglishTestFlow'
import { testApi } from '@/apis/test/test.api'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { TestType } from '@/types/test/test.types'

const route = useRoute()
const router = useRouter()
const testType = ((route.params.testType as string) || 'english') as TestType

if (testType !== 'english') {
  router.replace({ name: 'dashboard' })
}

const {
  loading,
  error,
  session,
  instructions,
  readingSet,
  speakingTopic,
  phase,
  writingValues,
  readingAnswers,
  isLocked,
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
} = useEnglishTestFlow(testType)

const confirmAndSubmit = async (message: string, fn: () => Promise<void>) => {
  const ok = window.confirm(message)
  if (!ok) return
  await fn()
}

const onSubmitWriting = async () => {
  await confirmAndSubmit(
    'Submitting Writing will lock this section. You cannot come back after submitting. Continue?',
    submitWriting,
  )
}

const onSubmitReading = async () => {
  await confirmAndSubmit(
    'Submitting Reading will lock this section. You cannot come back after submitting. Continue?',
    submitReading,
  )
}

const leaveWarningEnabled = computed(
  () =>
    session.value?.status === 'in_progress' &&
    (phase.value === 'writing' || phase.value === 'reading' || phase.value === 'speaking'),
)

useAttemptLeaveGuard({
  enabled: leaveWarningEnabled,
  message: 'Leaving or refreshing will mark your attempt as FAILED and you cannot re-take the test. Continue?',
  onAbandon: (kind) => {
    if (kind === 'unload') {
      testApi.markAttemptFailedSync(testType, 'left_test')
      return
    }
    void abandon('left_test')
  },
})

const goResults = () => {
  router.replace({ name: 'results', params: { testType } })
}

watch(
  () => phase.value,
  (p) => {
    if (p === 'results') goResults()
  },
)

onMounted(async () => {
  await init()
  if (isLocked.value) goResults()
})
</script>

<template>
  <AppShell>
    <div class="grid gap-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">ENGLISH TEST</div>
          <div class="mt-2 text-2xl font-extrabold tracking-[-0.4px]">
            <span v-if="phase === 'intro'">Instructions</span>
            <span v-else-if="phase === 'writing'">Writing</span>
            <span v-else-if="phase === 'reading'">Reading</span>
            <span v-else-if="phase === 'speaking'">Speaking</span>
            <span v-else>Results</span>
          </div>
          <div v-if="session" class="mt-1 text-xs font-bold text-white/55">
            Session: {{ session.id }} · Status: {{ session.status }}
          </div>
        </div>

        <div v-if="activeTimerLabel" class="rounded-2xl border border-white/10 bg-black/35 px-4 py-2 text-sm font-extrabold tracking-[0.6px]">
          {{ activeTimerLabel }} time:
          <span class="text-[#ff8a1f]">
            <span v-if="phase === 'writing'">{{ writingTimer.format.value }}</span>
            <span v-else-if="phase === 'reading'">{{ readingTimer.format.value }}</span>
            <span v-else-if="phase === 'speaking'">{{ speakingTimer.format.value }}</span>
          </span>
        </div>
      </div>

      <div v-if="error" class="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {{ error }}
      </div>

      <div v-if="loading" class="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-white/70">
        Loading...
      </div>

      <InstructionsStep
        v-else-if="phase === 'intro' && instructions"
        :title="instructions.title"
        :bullets="instructions.bullets"
        @start="start()"
      />

      <WritingStep
        v-else-if="phase === 'writing'"
        timer-label="Time left"
        :timer-value="writingTimer.format.value"
        :values="writingValues"
        @update:values="(v) => Object.assign(writingValues, v)"
        @submit="onSubmitWriting()"
      />

      <ReadingStep
        v-else-if="phase === 'reading' && readingSet"
        timer-label="Time left"
        :timer-value="readingTimer.format.value"
        :reading-set="readingSet"
        :answers="readingAnswers"
        @update:answers="(v) => Object.assign(readingAnswers, v)"
        @submit="onSubmitReading()"
      />

      <SpeakingStep
        v-else-if="phase === 'speaking' && speakingTopic"
        timer-label="Time left"
        :timer-value="speakingTimer.format.value"
        :topic="speakingTopic"
        :started-at="speakingStartedAt"
        :is-timer-running="speakingTimer.isRunning.value"
        :is-expired="speakingTimer.isExpired.value"
        @start="startSpeaking()"
        @submit="(blob) => submitSpeaking(blob)"
        @auto-submit="(blob, startedAt) => finalizeSpeakingAuto(blob, startedAt)"
      />

      <div v-else class="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-white/70">
        Preparing...
      </div>
    </div>
  </AppShell>
</template>
