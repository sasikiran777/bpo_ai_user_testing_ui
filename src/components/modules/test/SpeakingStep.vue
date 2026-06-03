<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SpeakingTopic } from '@/types/test/test.types'

const props = defineProps<{
  timerLabel: string
  timerValue: string
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
  permissionError.value = null
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

onBeforeUnmount(() => {
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
        <h2 class="mt-1 text-xl font-extrabold tracking-[-0.3px]">Speaking (3 minutes)</h2>
        <p class="mt-1 text-sm text-white/65">
          Click start and speak for up to 3 minutes. Recording auto-stops at the end, or you can submit early.
        </p>
      </div>
      <div class="rounded-2xl border border-white/10 bg-black/35 px-4 py-2 text-sm font-extrabold tracking-[0.6px]">
        {{ timerLabel }}: <span class="text-[#ff8a1f]">{{ timerValue }}</span>
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
        <span v-else class="text-white/70">Not started</span>
      </div>

      <div class="flex items-center gap-3">
        <AppButton
          v-if="recording"
          variant="secondary"
          class="h-10 px-6"
          @click="confirmManualSubmit"
        >
          Submit Test Now
        </AppButton>
        <AppButton class="h-10 px-6" :disabled="!canStart" @click="startRecording">Start Recording</AppButton>
      </div>
    </div>

    <div v-if="recording" class="text-xs font-semibold text-white/55">
      Note: Submitting now ends the test and you cannot come back.
    </div>
  </div>
</template>
