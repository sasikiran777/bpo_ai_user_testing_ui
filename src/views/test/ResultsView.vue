<script setup lang="ts">
import AppShell from "@/components/modules/app/AppShell.vue";
import AppButton from "@/components/ui/AppButton.vue";
import { testApi } from "@/apis/test/test.api";
import { testsApi } from "@/apis/test/tests.api";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { TestResults, TestSession, TestType } from "@/types/test/test.types";
import type { TestCatalogItem } from "@/types/test/testCatalog.types";

const route = useRoute();
const router = useRouter();
const testId = String(route.params.testId ?? "");
const testType = "english" as TestType;
const test = ref<TestCatalogItem | null>(null);

const loading = ref(true);
const session = ref<TestSession | null>(null);
const results = ref<TestResults | null>(null);
const audioUrl = ref<string | null>(null);
const pollId = ref<number | null>(null);

const load = async () => {
  loading.value = true;
  session.value = await testApi.getOrCreateSession(testType);
  results.value = await testApi.getResults(testType);

  if (session.value?.id && !audioUrl.value) {
    const blob = await testApi.getSpeakingAudio(testType, session.value.id);
    if (blob) {
      audioUrl.value = URL.createObjectURL(blob);
    }
  }
  loading.value = false;
};

const startPolling = () => {
  if (pollId.value != null) window.clearInterval(pollId.value);
  pollId.value = window.setInterval(async () => {
    results.value = await testApi.getResults(testType);
    if (results.value.status !== "grading" && pollId.value != null) {
      window.clearInterval(pollId.value);
      pollId.value = null;
    }
  }, 3000);
};

onMounted(async () => {
  if (!testId) {
    router.replace({ name: "dashboard" });
    return;
  }
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
  await load();
  if (results.value?.status === "grading") startPolling();
});

onBeforeUnmount(() => {
  if (pollId.value != null) window.clearInterval(pollId.value);
  pollId.value = null;
  if (audioUrl.value) URL.revokeObjectURL(audioUrl.value);
});
</script>

<template>
  <AppShell>
    <div class="grid gap-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">RESULTS</div>
          <h1 class="mt-2 text-3xl font-extrabold tracking-[-0.6px]">
            {{ test?.name ?? "Test Results" }}
          </h1>
          <div v-if="session" class="mt-2 text-xs font-bold text-white/55">
            Session: {{ session.id }}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <AppButton
            variant="secondary"
            class="h-10 px-5"
            @click="router.push({ name: 'dashboard' })"
            >Dashboard</AppButton
          >
        </div>
      </div>

      <div
        v-if="loading"
        class="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-white/70"
      >
        Loading results...
      </div>

      <div
        v-else-if="results && results.status === 'grading'"
        class="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur"
      >
        <div class="text-sm font-extrabold text-white/80">Grading in progress</div>
        <div class="mt-2 text-sm leading-6 text-white/65">
          Your submission is being graded. This page will update automatically.
        </div>
      </div>

      <div
        v-else-if="results && results.status === 'failed'"
        class="rounded-3xl border border-red-500/30 bg-red-500/10 p-6"
      >
        <div class="text-sm font-extrabold text-red-100">Attempt failed</div>
        <div class="mt-2 text-sm leading-6 text-red-100/80">
          This attempt was marked as failed because the test was closed/refreshed or left. You
          cannot re-take the test.
        </div>
      </div>

      <div v-else-if="results" class="grid gap-4">
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div class="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
            <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">OVERALL</div>
            <div class="mt-2 text-4xl font-black tracking-[-1px] text-[#ff8a1f]">
              {{ results.overall.score
              }}<span class="text-white/55">/{{ results.overall.maxScore }}</span>
            </div>
            <div class="mt-3 text-sm text-white/65">
              Proctoring events:
              <span class="text-white/85">{{ results.details.proctoringEvents }}</span>
            </div>
          </div>

          <div class="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
            <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">SECTION SCORES</div>
            <div class="mt-4 grid gap-2 text-sm text-white/75">
              <div class="flex items-center justify-between">
                <span>Writing</span>
                <span class="font-extrabold text-white/90"
                  >{{ results.writing.score }}/{{ results.writing.maxScore }}</span
                >
              </div>
              <div class="flex items-center justify-between">
                <span>Reading</span>
                <span class="font-extrabold text-white/90"
                  >{{ results.reading.score }}/{{ results.reading.maxScore }}</span
                >
              </div>
              <div class="flex items-center justify-between">
                <span>Speaking</span>
                <span class="font-extrabold text-white/90"
                  >{{ results.speaking.score }}/{{ results.speaking.maxScore }}</span
                >
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
          <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">SPEAKING AUDIO</div>
          <div class="mt-3">
            <audio v-if="audioUrl" :src="audioUrl" controls class="w-full" />
            <div v-else class="text-sm text-white/65">Audio uploaded.</div>
          </div>
        </div>

        <div
          v-if="session?.writing"
          class="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur"
        >
          <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">
            WRITING SUBMISSION
          </div>
          <div class="mt-4 grid gap-3 text-sm text-white/75">
            <div>
              <span class="font-semibold text-white/85">About me:</span>
              {{ session.writing.aboutMe }}
            </div>
            <div>
              <span class="font-semibold text-white/85">Location:</span>
              {{ session.writing.location }}
            </div>
            <div>
              <span class="font-semibold text-white/85">Experience:</span>
              {{ session.writing.experience }}
            </div>
            <div>
              <span class="font-semibold text-white/85">Roles:</span> {{ session.writing.roles }}
            </div>
            <div>
              <span class="font-semibold text-white/85">Responsibilities:</span>
              {{ session.writing.responsibilities }}
            </div>
            <div>
              <span class="font-semibold text-white/85">Other:</span> {{ session.writing.other }}
            </div>
          </div>
        </div>

        <div
          v-if="session?.reading"
          class="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur"
        >
          <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">READING ANSWERS</div>
          <div class="mt-3 text-sm text-white/65">
            Correct: <span class="text-white/85">{{ results.details.readingCorrect }}</span> /
            <span class="text-white/85">{{ results.details.readingTotal }}</span>
          </div>
          <div class="mt-4 grid gap-2 text-sm text-white/75">
            <div
              v-for="(v, k) in session.reading.answers"
              :key="k"
              class="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <span class="font-semibold text-white/85">{{ k }}</span>
              <span class="text-right">{{ v }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-white/70">
        No results yet.
      </div>
    </div>
  </AppShell>
</template>
