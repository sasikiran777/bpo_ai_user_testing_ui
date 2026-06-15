<script setup lang="ts">
import AppShell from "@/components/modules/app/AppShell.vue";
import AppButton from "@/components/ui/AppButton.vue";
import { testsApi } from "@/apis/test/tests.api";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { TestCatalogItem } from "@/types/test/testCatalog.types";
import { deriveUserTestState } from "@/utils/userTestStatus";

const route = useRoute();
const router = useRouter();
const testId = String(route.params.testId ?? "");
const test = ref<TestCatalogItem | null>(null);

const loading = ref(true);
const myTest = ref<TestCatalogItem | null>(null);
const pollId = ref<number | null>(null);
const resultsLoading = ref(false);
const resultsError = ref<string | null>(null);
const results = ref<unknown | null>(null);
const audioBySectionId = ref<
  Record<string, { url: string | null; loading: boolean; error: string | null }>
>({});

const status = computed(() => deriveUserTestState(myTest.value ?? {}));

type BackendResultSection = {
  id: string;
  name: string;
  max_marks: number;
  marks_obtained: number;
  ai_feedback?: string;
  questions?: string[];
  answers?: string[];
  test_notes?: string[];
  changed_windows_count?: number;
};

type BackendResults = {
  total_marks_obtained: number;
  total_max_marks: number;
  grading_completed?: boolean;
  user_test_mapping?: {
    started_at?: string;
    completed_at?: string;
    status?: string;
  };
  sections?: BackendResultSection[];
};

const resolved = computed(() => {
  const r = results.value;
  if (!r || typeof r !== "object") return null;
  const obj = r as Partial<BackendResults>;
  if (
    typeof obj.total_marks_obtained !== "number" ||
    typeof obj.total_max_marks !== "number" ||
    !Array.isArray(obj.sections)
  )
    return null;

  return {
    overall: { score: obj.total_marks_obtained, maxScore: obj.total_max_marks },
    startedAt: obj.user_test_mapping?.started_at ?? null,
    completedAt: obj.user_test_mapping?.completed_at ?? null,
    sections: obj.sections,
  };
});

const summaryCards = computed(() => {
  if (!resolved.value) return [];
  return [
    {
      key: "overall",
      label: "Overall",
      score: resolved.value.overall.score,
      maxScore: resolved.value.overall.maxScore,
      percentage:
        resolved.value.overall.maxScore > 0
          ? Math.round((resolved.value.overall.score / resolved.value.overall.maxScore) * 100)
          : 0,
    },
    ...resolved.value.sections.map((section) => ({
      key: section.id,
      label: section.name,
      score: Number(section.marks_obtained ?? 0),
      maxScore: Number(section.max_marks ?? 0),
      percentage:
        Number(section.max_marks ?? 0) > 0
          ? Math.round((Number(section.marks_obtained ?? 0) / Number(section.max_marks ?? 0)) * 100)
          : 0,
    })),
  ];
});

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(d);
};

const isAudioString = (v: string) =>
  /\.(webm|wav|mp3|m4a|ogg)(\?.*)?$/i.test(v) || v.toLowerCase().includes("storage/audio/");

const shouldLoadAudio = (sec: BackendResultSection) => {
  const n = String(sec.name ?? "").toLowerCase();
  if (n.includes("speak") || n.includes("read aloud")) return true;
  return (sec.answers ?? []).some((a) => typeof a === "string" && isAudioString(a));
};

const revokeAudioUrls = () => {
  const map = audioBySectionId.value;
  for (const v of Object.values(map)) {
    if (v.url) URL.revokeObjectURL(v.url);
  }
};

const loadSectionAudio = async (userTestMappingId: string, sectionId: string) => {
  audioBySectionId.value = {
    ...audioBySectionId.value,
    [sectionId]: { url: null, loading: true, error: null },
  };

  try {
    const blob = await testsApi.myTestSectionAudio(userTestMappingId, sectionId);
    const url = URL.createObjectURL(blob);
    audioBySectionId.value = {
      ...audioBySectionId.value,
      [sectionId]: { url, loading: false, error: null },
    };
  } catch (e) {
    audioBySectionId.value = {
      ...audioBySectionId.value,
      [sectionId]: {
        url: null,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load audio",
      },
    };
  }
};

const loadResults = async () => {
  const mappingId = myTest.value?.user_test_mapping_id;
  if (!mappingId) return;
  resultsLoading.value = true;
  resultsError.value = null;
  revokeAudioUrls();
  audioBySectionId.value = {};
  try {
    results.value = await testsApi.myTestResults(mappingId);
    const raw = results.value as Partial<BackendResults> | null;
    const secs = Array.isArray(raw?.sections) ? raw?.sections : [];
    for (const s of secs ?? []) {
      if (!s?.id) continue;
      if (!shouldLoadAudio(s)) continue;
      void loadSectionAudio(mappingId, s.id);
    }
  } catch (e) {
    resultsError.value = e instanceof Error ? e.message : "Failed to load results";
  } finally {
    resultsLoading.value = false;
  }
};

const load = async () => {
  loading.value = true;
  const list = await testsApi.myTests();
  myTest.value = list.find((t) => t.id === testId) ?? null;
  loading.value = false;
};

const startPolling = () => {
  if (pollId.value != null) window.clearInterval(pollId.value);
  pollId.value = window.setInterval(async () => {
    try {
      const list = await testsApi.myTests();
      myTest.value = list.find((t) => t.id === testId) ?? null;
    } catch {}
    const s = deriveUserTestState(myTest.value ?? {});
    if (s === "graded") void loadResults();
    if (s !== "in_gradding" && pollId.value != null) {
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
  if (status.value === "in_gradding") startPolling();
  if (status.value === "graded") await loadResults();
});

onBeforeUnmount(() => {
  if (pollId.value != null) window.clearInterval(pollId.value);
  pollId.value = null;
  revokeAudioUrls();
});
</script>

<template>
  <AppShell>
    <div class="grid gap-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">RESULTS</div>
          <h1 class="mt-2 wrap-break-word text-3xl font-extrabold tracking-[-0.6px]">
            {{ test?.name ?? "Test Results" }}
          </h1>
          <div
            v-if="myTest?.user_test_mapping_id"
            class="mt-2 break-all text-xs font-bold text-white/55"
          >
            Attempt: {{ myTest.user_test_mapping_id }}
          </div>
        </div>
        <div class="flex w-full items-center gap-3 sm:w-auto">
          <AppButton
            variant="secondary"
            class="h-10 w-full px-5 sm:w-auto"
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
        v-else-if="status === 'in_gradding'"
        class="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur"
      >
        <div class="text-sm font-extrabold text-white/80">Grading in progress</div>
        <div class="mt-2 text-sm leading-6 text-white/65">
          Your submission is being graded. This page will update automatically.
        </div>
      </div>

      <div
        v-else-if="status === 'failed'"
        class="rounded-3xl border border-red-500/30 bg-red-500/10 p-6"
      >
        <div class="text-sm font-extrabold text-red-100">Attempt failed</div>
        <div class="mt-2 text-sm leading-6 text-red-100/80">
          This attempt was marked as failed because the test was closed/refreshed or left. You
          cannot re-take the test.
        </div>
      </div>

      <div v-else-if="status === 'graded'" class="grid gap-4">
        <div
          v-if="resultsLoading"
          class="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-white/70"
        >
          Loading score...
        </div>
        <div
          v-else-if="resultsError"
          class="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100"
        >
          {{ resultsError }}
        </div>
        <div v-else-if="resolved" class="grid gap-4">
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="card in summaryCards"
              :key="card.key"
              class="rounded-3xl border border-white/10 bg-black/25 p-5 backdrop-blur"
            >
              <div class="text-xs font-extrabold tracking-[1.6px] text-white/55">
                {{ card.label.toUpperCase() }}
              </div>
              <div class="mt-2 flex items-end justify-between gap-3">
                <div class="text-3xl font-extrabold text-white">
                  {{ card.score }}<span class="text-white/55">/{{ card.maxScore }}</span>
                </div>
                <div class="text-sm font-extrabold text-[#ff8a1f]">{{ card.percentage }}%</div>
              </div>
            </div>
          </div>

          <div
            v-if="resolved.startedAt || resolved.completedAt"
            class="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-white/70 backdrop-blur"
          >
            <div v-if="resolved.startedAt">Started: {{ formatDateTime(resolved.startedAt) }}</div>
            <div v-if="resolved.completedAt" class="mt-1">
              Completed: {{ formatDateTime(resolved.completedAt) }}
            </div>
          </div>

          <div
            v-for="sec in resolved.sections"
            :key="sec.id"
            class="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur"
          >
            <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div class="text-sm font-extrabold text-white/85">{{ sec.name }}</div>
              <div class="text-sm font-extrabold text-white">
                {{ sec.marks_obtained }}<span class="text-white/55">/{{ sec.max_marks }}</span>
              </div>
            </div>

            <div
              v-if="typeof sec.changed_windows_count === 'number'"
              class="mt-2 text-xs font-semibold text-white/55"
            >
              Focus changes: {{ sec.changed_windows_count }}
            </div>

            <div v-if="sec.ai_feedback" class="mt-4 text-sm leading-6 text-white/75">
              <div class="text-xs font-extrabold tracking-[1.6px] text-white/55">AI FEEDBACK</div>
              <div class="mt-2">{{ sec.ai_feedback }}</div>
            </div>

            <div v-if="sec.test_notes?.length" class="mt-4 text-sm leading-6 text-white/75">
              <div class="text-xs font-extrabold tracking-[1.6px] text-white/55">TEST NOTES</div>
              <div class="mt-2 grid gap-2">
                <div
                  v-for="(n, i) in sec.test_notes"
                  :key="i"
                  class="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  {{ n }}
                </div>
              </div>
            </div>

            <div v-if="sec.questions?.length" class="mt-4 grid gap-3">
              <div class="text-xs font-extrabold tracking-[1.6px] text-white/55">QUESTIONS</div>
              <div
                v-for="(q, i) in sec.questions"
                :key="i"
                class="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <div class="text-sm font-semibold text-white/85">{{ i + 1 }}. {{ q }}</div>
                <div class="mt-2 wrap-break-word text-sm text-white/70">
                  <template v-if="sec.answers && sec.answers[i] && isAudioString(sec.answers[i])">
                    <template v-if="audioBySectionId[sec.id]?.loading">Loading audio...</template>
                    <template v-else-if="audioBySectionId[sec.id]?.error">{{
                      audioBySectionId[sec.id]?.error
                    }}</template>
                    <audio
                      v-else-if="audioBySectionId[sec.id]?.url"
                      class="mt-2 w-full"
                      :src="audioBySectionId[sec.id]?.url ?? undefined"
                      controls
                    />
                    <template v-else>Audio not available.</template>
                  </template>
                  <template v-else>Answer: {{ (sec.answers && sec.answers[i]) || "" }}</template>
                </div>
              </div>
            </div>

            <div v-else-if="shouldLoadAudio(sec)" class="mt-4">
              <div class="text-xs font-extrabold tracking-[1.6px] text-white/55">AUDIO</div>
              <div v-if="audioBySectionId[sec.id]?.loading" class="mt-2 text-sm text-white/70">
                Loading audio...
              </div>
              <div v-else-if="audioBySectionId[sec.id]?.error" class="mt-2 text-sm text-red-100">
                {{ audioBySectionId[sec.id]?.error }}
              </div>
              <audio
                v-else-if="audioBySectionId[sec.id]?.url"
                class="mt-2 w-full"
                :src="audioBySectionId[sec.id]?.url ?? undefined"
                controls
              />
            </div>
          </div>
        </div>
        <div v-else class="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
          <div class="text-sm font-extrabold text-white/80">Graded</div>
          <div class="mt-2 text-sm leading-6 text-white/65">
            Results are ready, but the response format isn’t recognized by the UI yet.
          </div>
          <pre
            class="mt-4 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-2xl border border-white/10 bg-black/35 p-4 text-xs text-white/70"
            >{{ JSON.stringify(results, null, 2) }}</pre
          >
        </div>
      </div>

      <div v-else class="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-white/70">
        No results yet.
      </div>
    </div>
  </AppShell>
</template>
