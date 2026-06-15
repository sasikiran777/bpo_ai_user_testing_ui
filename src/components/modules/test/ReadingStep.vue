<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import type { ReadingSet } from '@/types/test/test.types'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  timerLabel: string
  timerValue: string
  maxTimeMin: number
  disabled?: boolean
  readingSet: ReadingSet
  answers: Record<string, string>
  startedAt: number | null
  isTimerRunning: boolean
  isExpired: boolean
}>()

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'submit'): void
  (e: 'update:answers', answers: Record<string, string>): void
}>()

const answer = (id: string) => props.answers[id] ?? ''

const setAnswer = (id: string, value: string) => {
  emit('update:answers', { ...props.answers, [id]: value })
}

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

const canAnswer = computed(() => !!props.startedAt || props.isTimerRunning)

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

const onTextInput = (id: string, e: Event) => {
  const value = (e.target as HTMLInputElement | null)?.value ?? ''
  setAnswer(id, value)
}

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
        <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">SECTION 2</div>
        <h2 class="mt-1 text-xl font-extrabold tracking-[-0.3px]">Reading ({{ timeLabel }})</h2>
        <p class="mt-1 text-sm text-white/65">Read the passage and answer the questions. Auto-submits when time ends.</p>
      </div>
    </div>

    <div
      v-if="!canAnswer && typeof prepRemaining === 'number'"
      class="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/75 sm:flex-row sm:items-center"
    >
      Starting in <span class="font-extrabold text-[#ff8a1f]">{{ prepRemaining }}s</span>. You can start now if you are ready.
      <AppButton variant="secondary" class="h-9 w-full px-4 sm:ml-3 sm:w-auto" @click="startNow">Start Now</AppButton>
    </div>

    <div class="rounded-3xl border border-white/10 bg-black/30 p-5 text-sm leading-6 text-white/75">
      {{ readingSet.passage }}
    </div>

    <div class="grid gap-5">
      <div v-for="q in readingSet.questions" :key="q.id" class="rounded-3xl border border-white/10 bg-black/30 p-5">
        <div class="text-sm font-semibold text-white/85">{{ q.prompt }}</div>

        <div v-if="q.type === 'mcq'" class="mt-4 grid gap-2">
          <label
            v-for="opt in q.options"
            :key="opt"
            class="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/75"
            :class="canAnswer && !disabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'"
          >
            <input
              class="h-4 w-4 accent-[#ff8a1f]"
              type="radio"
              :value="opt"
              :checked="answer(q.id) === opt"
              :disabled="!canAnswer || disabled"
              @change="setAnswer(q.id, opt)"
            />
            <span>{{ opt }}</span>
          </label>
        </div>

        <div v-else class="mt-4">
          <input
            :value="answer(q.id)"
            data-app-input
            data-error="false"
            class="h-11 w-full rounded-2xl border bg-white/95 px-3 text-sm text-[#0f172a] outline-none"
            placeholder="Type your answer..."
            :disabled="!canAnswer || disabled"
            @input="onTextInput(q.id, $event)"
          />
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      <div class="mr-auto text-xs font-semibold text-white/55">
        Note: If you submit this section, you cannot come back to edit it.
      </div>
      <AppButton class="h-10 w-full px-6 sm:w-auto" :disabled="disabled || !canAnswer" @click="emit('submit')">Next</AppButton>
    </div>
  </div>
</template>
