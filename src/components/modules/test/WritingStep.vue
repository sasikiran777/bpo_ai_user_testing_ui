<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

type WritingValues = {
  response: string
}

const props = defineProps<{
  timerLabel: string
  timerValue: string
  maxTimeMin: number
  disabled?: boolean
  values: WritingValues
  startedAt: number | null
  isTimerRunning: boolean
  isExpired: boolean
}>()

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'submit'): void
  (e: 'update:values', values: WritingValues): void
}>()

const updateField = <K extends keyof WritingValues>(key: K, value: WritingValues[K]) => {
  emit('update:values', { ...props.values, [key]: value })
}

const prepSeconds = 30
const prepRemaining = ref<number | null>(null)
let prepInterval: number | null = null

const response = computed({
  get: () => props.values.response,
  set: (v: string) => updateField('response', v),
})

const clearPrep = () => {
  if (prepInterval) window.clearInterval(prepInterval)
  prepInterval = null
  prepRemaining.value = null
}

const beginPrep = () => {
  if (props.disabled || props.isExpired) return
  if (props.startedAt || props.isTimerRunning) return
  if (prepInterval) return
  prepRemaining.value = prepSeconds
  prepInterval = window.setInterval(() => {
    if (prepRemaining.value === null) return
    if (prepRemaining.value <= 1) {
      clearPrep()
      emit('start')
      return
    }
    prepRemaining.value -= 1
  }, 1000)
}

const startNow = () => {
  if (props.disabled || props.isExpired) return
  if (props.startedAt || props.isTimerRunning) return
  clearPrep()
  emit('start')
}

const wordCount = computed(() => {
  const text = props.values.response.trim()
  if (!text) return 0
  return text.split(/\s+/).length
})

const isEmpty = computed(() => !props.values.response.trim())
const canType = computed(() => !!props.startedAt || props.isTimerRunning)
const timeLabel = computed(() => {
  const m = props.maxTimeMin
  if (m < 1) return `${Math.round(m * 60)} seconds`
  if (m === 1) return '1 minute'
  return `${m} minutes`
})

watch(
  () => [props.startedAt, props.isTimerRunning, props.disabled, props.isExpired] as const,
  ([startedAt, isTimerRunning, disabled, isExpired]) => {
    if (disabled || isExpired || startedAt || isTimerRunning) {
      clearPrep()
      return
    }
    beginPrep()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearPrep()
})
</script>

<template>
  <div class="grid gap-6 rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">SECTION 1</div>
        <h2 class="mt-1 text-xl font-extrabold tracking-[-0.3px]">Writing ({{ timeLabel }})</h2>
        <p class="mt-1 text-sm text-white/65">
          Tell us about yourself. Include your name, where you are from, and your work experience.
          You get a 30-second heads up and can start earlier if you want.
        </p>
      </div>
    </div>

    <div class="rounded-3xl border border-white/10 bg-black/30 p-5">
      <div class="text-sm font-semibold text-white/85">Prompt</div>
      <div class="mt-2 whitespace-pre-line text-sm leading-6 text-white/75">
        Tell us about yourself. Please share your name, where you are from, and your work
        experience. You can also include the type of work you have done and anything else that
        helps us get to know you better.
      </div>
    </div>

    <div class="grid gap-4">
      <div
        v-if="!canType && typeof prepRemaining === 'number'"
        class="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/75 sm:flex-row sm:items-center"
      >
        Starting in <span class="font-extrabold text-[#ff8a1f]">{{ prepRemaining }}s</span>. You can
        start now if you are ready.
        <AppButton variant="secondary" class="h-9 w-full px-4 sm:ml-3 sm:w-auto" @click="startNow">Start Now</AppButton>
      </div>

      <div class="flex flex-wrap items-center gap-3 text-xs font-semibold">
        <span class="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-white/70">
          Word count: {{ wordCount }}
        </span>
        <span class="text-white/55">One response only</span>
        <span class="text-white/55">Auto-submits when time ends</span>
      </div>

      <div class="grid gap-1.5">
        <label class="text-[13px] font-semibold text-white/80">Tell us about yourself</label>
        <textarea
          v-model="response"
          :disabled="!canType || disabled"
          class="min-h-64 w-full resize-y rounded-3xl border border-white/10 bg-white/95 px-4 py-3 text-sm leading-6 text-[#0f172a] outline-none sm:min-h-88"
          placeholder="Write about your name, where you are from, your work experience, and anything else you want us to know..."
        />
      </div>

      <div v-if="isEmpty" class="text-sm text-white/60">
        Please write your response before submitting.
      </div>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      <div class="mr-auto text-xs font-semibold text-white/55">
        Note: Empty submissions are blocked. The section auto-submits when time ends.
      </div>
      <AppButton class="h-10 w-full px-6 sm:w-auto" :disabled="disabled || isEmpty" @click="emit('submit')">Next</AppButton>
    </div>
  </div>
</template>
