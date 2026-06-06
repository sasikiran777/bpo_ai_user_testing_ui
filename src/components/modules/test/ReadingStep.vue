<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import type { ReadingSet } from '@/types/test/test.types'

const props = defineProps<{
  timerLabel: string
  timerValue: string
  disabled?: boolean
  readingSet: ReadingSet
  answers: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'update:answers', answers: Record<string, string>): void
}>()

const answer = (id: string) => props.answers[id] ?? ''

const setAnswer = (id: string, value: string) => {
  emit('update:answers', { ...props.answers, [id]: value })
}

const onTextInput = (id: string, e: Event) => {
  const value = (e.target as HTMLInputElement | null)?.value ?? ''
  setAnswer(id, value)
}
</script>

<template>
  <div class="grid gap-6 rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">SECTION 2</div>
        <h2 class="mt-1 text-xl font-extrabold tracking-[-0.3px]">Reading (5 minutes)</h2>
        <p class="mt-1 text-sm text-white/65">Read the passage and answer the questions. Auto-submits when time ends.</p>
      </div>
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
            class="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/75"
          >
            <input
              class="h-4 w-4 accent-[#ff8a1f]"
              type="radio"
              :value="opt"
              :checked="answer(q.id) === opt"
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
            @input="onTextInput(q.id, $event)"
          />
        </div>
      </div>
    </div>

    <div class="flex items-center justify-end gap-3">
      <div class="mr-auto text-xs font-semibold text-white/55">
        Note: If you submit this section, you cannot come back to edit it.
      </div>
      <AppButton class="h-10 px-6" :disabled="disabled" @click="emit('submit')">Next</AppButton>
    </div>
  </div>
</template>
