<script setup lang="ts">
import AppShell from "@/components/modules/app/AppShell.vue";
import AppButton from "@/components/ui/AppButton.vue";
import { testsApi } from "@/apis/test/tests.api";
import { onBeforeUnmount, onMounted, ref } from "vue";
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
    if (deriveUserTestState(myTest.value ?? {}) !== "in_gradding" && pollId.value != null) {
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
  if (deriveUserTestState(myTest.value ?? {}) === "in_gradding") startPolling();
});

onBeforeUnmount(() => {
  if (pollId.value != null) window.clearInterval(pollId.value);
  pollId.value = null;
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
          <div v-if="myTest?.user_test_mapping_id" class="mt-2 text-xs font-bold text-white/55">
            Attempt: {{ myTest.user_test_mapping_id }}
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
        v-else-if="deriveUserTestState(myTest ?? {}) === 'in_gradding'"
        class="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur"
      >
        <div class="text-sm font-extrabold text-white/80">Grading in progress</div>
        <div class="mt-2 text-sm leading-6 text-white/65">
          Your submission is being graded. This page will update automatically.
        </div>
      </div>

      <div
        v-else-if="deriveUserTestState(myTest ?? {}) === 'failed'"
        class="rounded-3xl border border-red-500/30 bg-red-500/10 p-6"
      >
        <div class="text-sm font-extrabold text-red-100">Attempt failed</div>
        <div class="mt-2 text-sm leading-6 text-red-100/80">
          This attempt was marked as failed because the test was closed/refreshed or left. You
          cannot re-take the test.
        </div>
      </div>

      <div v-else-if="deriveUserTestState(myTest ?? {}) === 'gradded'" class="grid gap-4">
        <div class="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
          <div class="text-sm font-extrabold text-white/80">Graded</div>
          <div class="mt-2 text-sm leading-6 text-white/65">
            Results are ready. This page will show the full score breakdown once the graded results
            API is connected.
          </div>
        </div>
      </div>

      <div v-else class="rounded-3xl border border-white/10 bg-black/25 p-6 text-sm text-white/70">
        No results yet.
      </div>
    </div>
  </AppShell>
</template>
