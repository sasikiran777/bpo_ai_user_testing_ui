<script setup lang="ts">
import AppShell from "@/components/modules/app/AppShell.vue";
import InstructionsStep from "@/components/modules/test/InstructionsStep.vue";
import WritingStep from "@/components/modules/test/WritingStep.vue";
import ReadingStep from "@/components/modules/test/ReadingStep.vue";
import SpeakingStep from "@/components/modules/test/SpeakingStep.vue";
import ReadAloudStep from "@/components/modules/test/ReadAloudStep.vue";
import EmailWritingStep from "@/components/modules/test/EmailWritingStep.vue";
import { useAttemptLeaveGuard } from "@/composables/test/useAttemptLeaveGuard";
import { useEnglishTestFlow } from "@/composables/test/useEnglishTestFlow";
import { testsApi } from "@/apis/test/tests.api";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { TestType } from "@/types/test/test.types";
import type { TestCatalogItem } from "@/types/test/testCatalog.types";

const route = useRoute();
const router = useRouter();
const testId = String(route.params.testId ?? "");
const testType = "english" as TestType;
const test = ref<TestCatalogItem | null>(null);

if (!testId) router.replace({ name: "dashboard" });

const mappingKey = (id: string) => `bpo_user_test_mapping_id:${id}`;
const sectionsKey = (id: string) => `bpo_test_sections:${id}`;

const storeSectionIds = (t: TestCatalogItem) => {
  const map: Record<string, string> = {};
  for (const s of t.sections ?? []) {
    const n = s.name.trim().toLowerCase();
    if (n === "write") map.writing = s.id;
    else if (n === "read") map.reading = s.id;
    else if (n === "speak") map.speaking = s.id;
    else if (n === "read aloud") map.readAloud = s.id;
    else if (n === "email writing") map.emailWriting = s.id;
  }
  sessionStorage.setItem(sectionsKey(testId), JSON.stringify(map));
};

const {
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
  isLocked,
  writingTimer,
  readingTimer,
  speakingTimer,
  readAloudTimer,
  emailWritingTimer,
  activeTimerLabel,
  init,
  start,
  abandon,
  submitWriting,
  submitReading,
  startSpeaking,
  submitSpeaking,
  finalizeSpeakingAuto,
  startReadAloud,
  submitReadAloud,
  finalizeReadAloudAuto,
  submitEmailWriting,
  speakingStartedAt,
  readAloudStartedAt,
} = useEnglishTestFlow(testType, testId);

const confirmAndSubmit = async (message: string, fn: () => Promise<void>) => {
  const ok = window.confirm(message);
  if (!ok) return;
  await fn();
};

const onSubmitWriting = async () => {
  await confirmAndSubmit(
    "Submitting Writing will lock this section. You cannot come back after submitting. Continue?",
    submitWriting,
  );
};

const onSubmitReading = async () => {
  await confirmAndSubmit(
    "Submitting Reading will lock this section. You cannot come back after submitting. Continue?",
    submitReading,
  );
};

const onSubmitEmailWriting = async () => {
  if (!emailWritingValue.value.trim()) {
    error.value = "Please write your email response before submitting.";
    return;
  }

  await confirmAndSubmit(
    "Submitting Email Writing will finish your test. You cannot come back after submitting. Continue?",
    submitEmailWriting,
  );
};

const onUpdateEmailWriting = (value: string) => {
  emailWritingValue.value = value;
  error.value = null;
};

const startLoading = ref(false);

const onStart = async () => {
  if (startLoading.value) return;
  startLoading.value = true;
  error.value = null;
  try {
    sessionStorage.removeItem(mappingKey(testId));
    const started = await testsApi.startMyTest(testId, { micro_phone_permission: true });
    const mappingId = started?.user_test_mapping_id;
    if (!mappingId || mappingId === "undefined" || mappingId === "null") {
      throw new Error("Start response missing user_test_mapping_id");
    }
    sessionStorage.setItem(mappingKey(testId), mappingId);

    await start();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Failed to start test";
  } finally {
    startLoading.value = false;
  }
};

const leaveWarningEnabled = computed(
  () =>
    session.value?.status === "in_progress" &&
    ["writing", "reading", "speaking", "readAloud", "emailWriting"].includes(phase.value),
);

const phaseTitle = computed(() => {
  if (phase.value === "intro") return "Instructions";
  if (phase.value === "writing") return "Writing";
  if (phase.value === "reading") return "Reading";
  if (phase.value === "speaking") return "Speaking";
  if (phase.value === "readAloud") return "Read Aloud";
  if (phase.value === "emailWriting") return "Email Writing";
  return "Results";
});

let dropCalledOnUnload = false;

useAttemptLeaveGuard({
  enabled: leaveWarningEnabled,
  message:
    "Leaving or refreshing will mark your attempt as FAILED and you cannot re-take the test. Continue?",
  onAbandon: (kind) => {
    if (kind === "unload") {
      if (dropCalledOnUnload) return;
      dropCalledOnUnload = true;
      const mappingId = sessionStorage.getItem(mappingKey(testId));
      if (mappingId) void testsApi.dropMyTest(mappingId, { keepalive: true });
      return;
    }
    if (testId) void testsApi.failMyTest(testId);
    void abandon("left_test");
  },
});

const goResults = () => {
  router.replace({ name: "results", params: { testId } });
};

watch(
  () => phase.value,
  (p) => {
    if (p === "results") goResults();
  },
);

onMounted(async () => {
  try {
    test.value = await testsApi.get(testId);
  } catch {
    router.replace({ name: "dashboard" });
    return;
  }
  if (test.value?.code !== "english") {
    router.replace({ name: "dashboard" });
    return;
  }
  storeSectionIds(test.value);

  await init();
  if (test.value)
    instructions.value = { title: test.value.name, bullets: test.value.instruction ?? [] };
  if (isLocked.value) goResults();
});
</script>

<template>
  <AppShell logout-disabled>
    <div class="grid gap-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">
            {{ (test?.name ?? "TEST").toUpperCase() }}
          </div>
          <div class="mt-2 text-2xl font-extrabold tracking-[-0.4px]">
            {{ phaseTitle }}
          </div>
          <div v-if="session" class="mt-1 text-xs font-bold text-white/55">
            Session: {{ session.id }} · Status: {{ session.status }}
          </div>
        </div>

        <div
          v-if="activeTimerLabel"
          class="rounded-2xl border border-white/10 bg-black/35 px-4 py-2 text-sm font-extrabold tracking-[0.6px]"
        >
          {{ activeTimerLabel }} time:
          <span class="text-[#ff8a1f]">
            <span v-if="phase === 'writing'">{{ writingTimer.format.value }}</span>
            <span v-else-if="phase === 'reading'">{{ readingTimer.format.value }}</span>
            <span v-else-if="phase === 'speaking'">{{ speakingTimer.format.value }}</span>
            <span v-else-if="phase === 'readAloud'">{{ readAloudTimer.format.value }}</span>
            <span v-else-if="phase === 'emailWriting'">{{ emailWritingTimer.format.value }}</span>
          </span>
        </div>
      </div>

      <div
        v-if="error"
        class="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
      >
        {{ error }}
      </div>

      <div
        v-if="loading"
        class="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-white/70"
      >
        Loading...
      </div>

      <InstructionsStep
        v-else-if="phase === 'intro' && instructions"
        :title="instructions.title"
        :bullets="instructions.bullets"
        :loading="startLoading"
        @start="onStart"
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

      <ReadAloudStep
        v-else-if="phase === 'readAloud' && readAloudTopic"
        timer-label="Time left"
        :timer-value="readAloudTimer.format.value"
        :topic="readAloudTopic"
        :started-at="readAloudStartedAt"
        :is-timer-running="readAloudTimer.isRunning.value"
        :is-expired="readAloudTimer.isExpired.value"
        @start="startReadAloud()"
        @submit="(blob) => submitReadAloud(blob)"
        @auto-submit="(blob, startedAt) => finalizeReadAloudAuto(blob, startedAt)"
      />

      <EmailWritingStep
        v-else-if="phase === 'emailWriting' && emailWritingTopic"
        timer-label="Time left"
        :timer-value="emailWritingTimer.format.value"
        :prompt="emailWritingTopic.prompt"
        :value="emailWritingValue"
        @update:value="onUpdateEmailWriting"
        @submit="onSubmitEmailWriting()"
      />

      <div v-else class="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-white/70">
        Preparing...
      </div>
    </div>
  </AppShell>
</template>
