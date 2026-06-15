<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SpeakingTopic } from '@/types/test/test.types'

const props = defineProps<{
  timerLabel: string
  timerValue: string
  maxTimeMin: number
  disabled?: boolean
  topic: SpeakingTopic
  startedAt: number | null
  isTimerRunning: boolean
  isExpired: boolean
}>()

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'submit', audio: Blob): void
  (e: 'autoSubmit', audio: Blob, startedAt: number): void
}>()

const mediaRecorder = ref<MediaRecorder | null>(null)
const chunks = ref<BlobPart[]>([])
const recording = ref(false)
const permissionError = ref<string | null>(null)
const stopped = ref(false)

const canStart = computed(() => !props.disabled && !recording.value && !stopped.value)
const timeLabel = computed(() => {
  const m = props.maxTimeMin
  if (m < 1) return `${Math.round(m * 60)} seconds`
  if (m === 1) return '1 minute'
  return `${m} minutes`
})

const prepSeconds = 30
const prepRemaining = ref<number | null>(null)
let prepInterval: number | null = null

const clearPrep = () => {
  if (prepInterval) window.clearInterval(prepInterval)
  prepInterval = null
  prepRemaining.value = null
}

const beginPrep = () => {
  if (recording.value || stopped.value) return
  if (props.startedAt || props.isTimerRunning) return
  if (prepInterval) return
  prepRemaining.value = prepSeconds
  prepInterval = window.setInterval(() => {
    if (prepRemaining.value === null) return
    if (prepRemaining.value <= 1) {
      clearPrep()
      void startRecording()
      return
    }
    prepRemaining.value -= 1
  }, 1000)
}

const isLocalhost =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

const isSecureEnough = () => window.isSecureContext || isLocalhost

const confirmManualSubmit = () => {
  const ok = window.confirm(
    'Submitting will end the Speaking section and submit the full test. You cannot come back after submitting. Continue?',
  )
  if (!ok) return
  stopRecording(false)
}

const stopRecording = (auto: boolean) => {
  if (!mediaRecorder.value || mediaRecorder.value.state !== 'recording') return
  stopped.value = true
  recording.value = false
  const startedAt = props.startedAt ?? Date.now()
  const onStop = () => {
    const blob = new Blob(chunks.value, { type: mediaRecorder.value?.mimeType ?? 'audio/webm' })
    chunks.value = []
    if (auto) emit('autoSubmit', blob, startedAt)
    else emit('submit', blob)
  }
  mediaRecorder.value.addEventListener('stop', onStop, { once: true })
  mediaRecorder.value.stop()
}

const startRecording = async () => {
  clearPrep()
  permissionError.value = null
  if (!isSecureEnough()) {
    permissionError.value =
      'Microphone access requires HTTPS. Please open this site using https:// and try again.'
    return
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    permissionError.value = 'This browser does not support microphone access.'
    return
  }
  if (typeof window.MediaRecorder === 'undefined') {
    permissionError.value =
      'This browser does not support audio recording. Please try Chrome on Android or Safari 17+.'
    return
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    mediaRecorder.value = recorder
    chunks.value = []
    stopped.value = false
    recorder.addEventListener('dataavailable', (e) => {
      if (e.data.size > 0) chunks.value.push(e.data)
    })
    recorder.addEventListener(
      'stop',
      () => {
        stream.getTracks().forEach((t) => t.stop())
      },
      { once: true },
    )
    emit('start')
    recorder.start()
    recording.value = true
  } catch (e) {
    permissionError.value = e instanceof Error ? e.message : 'Microphone permission denied'
  }
}

watch(
  () => props.isExpired,
  (v) => {
    if (!v) return
    stopRecording(true)
  },
)

watch(
  () => [props.startedAt, props.isTimerRunning, recording.value, stopped.value] as const,
  ([startedAt, isTimerRunning, isRecording, isStopped]) => {
    if (startedAt || isTimerRunning || isRecording || isStopped) {
      clearPrep()
      return
    }
    beginPrep()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearPrep()
  if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
    stopRecording(true)
  }
})
</script>

<template>
  <div class="grid gap-6 rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">SECTION 3</div>
        <h2 class="mt-1 text-xl font-extrabold tracking-[-0.3px]">Speaking ({{ timeLabel }})</h2>
        <p class="mt-1 text-sm text-white/65">
          You have 30 seconds to prepare. Recording starts automatically, or you can start early. Recording auto-stops at the end.
        </p>
      </div>
    </div>

    <div class="rounded-3xl border border-white/10 bg-black/30 p-5">
      <div class="text-sm font-semibold text-white/85">Topic</div>
      <div class="mt-2 text-sm leading-6 text-white/75">{{ topic.prompt }}</div>
    </div>

    <div v-if="permissionError" class="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {{ permissionError }}
    </div>

    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div class="text-sm font-semibold text-white/80">
        Status:
        <span v-if="recording" class="text-[#ff8a1f]">Recording…</span>
        <span v-else-if="stopped" class="text-white/70">Uploading…</span>
        <span v-else-if="typeof prepRemaining === 'number'" class="text-white/70">
          Starts in {{ prepRemaining }}s
        </span>
        <span v-else class="text-white/70">Not started</span>
      </div>

      <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
        <AppButton
          v-if="recording"
          variant="secondary"
          class="h-10 w-full px-6 sm:w-auto"
          @click="confirmManualSubmit"
        >
          Submit Test Now
        </AppButton>
        <AppButton class="h-10 w-full px-6 sm:w-auto" :disabled="!canStart" @click="startRecording">Start Now</AppButton>
      </div>
    </div>

    <div v-if="recording" class="text-xs font-semibold text-white/55">
      Note: Submitting now ends the test and you cannot come back.
    </div>
  </div>
</template>
