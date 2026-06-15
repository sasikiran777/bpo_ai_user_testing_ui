<script setup lang="ts">
import AppButton from "@/components/ui/AppButton.vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps<{
  timerLabel: string;
  timerValue: string;
  maxTimeMin: number;
  disabled?: boolean;
  prompt: string;
  value: string;
  startedAt: number | null;
  isTimerRunning: boolean;
  isExpired: boolean;
}>();

const emit = defineEmits<{
  (e: "start"): void;
  (e: "submit"): void;
  (e: "update:value", value: string): void;
}>();

const prepSeconds = 30;
const prepRemaining = ref<number | null>(null);
let prepInterval: number | null = null;

const clearPrep = () => {
  if (prepInterval) window.clearInterval(prepInterval);
  prepInterval = null;
  prepRemaining.value = null;
};

const beginPrep = () => {
  if (props.disabled || props.isExpired) return;
  if (props.startedAt || props.isTimerRunning) return;
  if (prepInterval) return;
  prepRemaining.value = prepSeconds;
  prepInterval = window.setInterval(() => {
    if (prepRemaining.value === null) return;
    if (prepRemaining.value <= 1) {
      clearPrep();
      emit("start");
      return;
    }
    prepRemaining.value -= 1;
  }, 1000);
};

const startNow = () => {
  if (props.disabled || props.isExpired) return;
  if (props.startedAt || props.isTimerRunning) return;
  clearPrep();
  emit("start");
};

const wordCount = computed(() => {
  const text = props.value.trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
});

const isEmpty = computed(() => !props.value.trim());
const belowMinimum = computed(() => wordCount.value > 0 && wordCount.value < 100);
const aboveRecommended = computed(() => wordCount.value > 250);
const timeLabel = computed(() => {
  const m = props.maxTimeMin;
  if (m < 1) return `${Math.round(m * 60)} seconds`;
  if (m === 1) return "1 minute";
  return `${m} minutes`;
});
const canType = computed(() => !!props.startedAt || props.isTimerRunning);

const updateValue = (event: Event) => {
  if (!canType.value) return;
  const value = (event.target as HTMLTextAreaElement | null)?.value ?? "";
  emit("update:value", value);
};

watch(
  () => [props.startedAt, props.isTimerRunning, props.disabled, props.isExpired] as const,
  ([startedAt, isTimerRunning, disabled, isExpired]) => {
    if (disabled || isExpired || startedAt || isTimerRunning) {
      clearPrep();
      return;
    }
    beginPrep();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  clearPrep();
});
</script>

<template>
  <div class="grid gap-6 rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">SECTION 5</div>
        <h2 class="mt-1 text-xl font-extrabold tracking-[-0.3px]">Email Writing ({{ timeLabel }})</h2>
        <p class="mt-1 text-sm text-white/65">
          Write a clear workplace email. Aim for 120-180 words and include a subject, greeting,
          body, and closing.
        </p>
      </div>
    </div>

    <div class="rounded-3xl border border-white/10 bg-black/30 p-5">
      <div class="text-sm font-semibold text-white/85">Scenario</div>
      <div class="mt-2 whitespace-pre-line text-sm leading-6 text-white/75">{{ prompt }}</div>
    </div>

    <div class="grid gap-3">
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
        <span class="text-white/55">Minimum 100</span>
        <span class="text-white/55">Target 120-180</span>
        <span class="text-white/55">Recommended max 250</span>
      </div>

      <textarea
        :value="value"
        :disabled="!canType || disabled"
        class="min-h-60 w-full resize-y rounded-3xl border border-white/10 bg-white/95 px-4 py-3 text-sm leading-6 text-[#0f172a] outline-none sm:min-h-72"
        placeholder="Subject:&#10;&#10;Dear ...&#10;&#10;Write your email here..."
        @input="updateValue"
      />

      <div v-if="isEmpty" class="text-sm text-white/60">
        Please write your response before submitting.
      </div>
      <div v-else-if="belowMinimum" class="text-sm text-[#ffcf99]">
        Your draft is below the recommended minimum of 100 words.
      </div>
      <div v-else-if="aboveRecommended" class="text-sm text-[#ffcf99]">
        Your draft is above the recommended maximum of 250 words.
      </div>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      <div class="mr-auto text-xs font-semibold text-white/55">
        Note: Empty submissions are blocked. The section auto-submits when time ends.
      </div>
      <AppButton class="h-10 w-full px-6 sm:w-auto" :disabled="disabled || isEmpty" @click="emit('submit')"
        >Submit Test</AppButton
      >
    </div>
  </div>
</template>
