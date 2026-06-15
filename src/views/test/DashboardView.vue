<script setup lang="ts">
import AppShell from "@/components/modules/app/AppShell.vue";
import AppButton from "@/components/ui/AppButton.vue";
import { testsApi } from "@/apis/test/tests.api";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import type { TestCatalogItem } from "@/types/test/testCatalog.types";
import { deriveUserTestState } from "@/utils/userTestStatus";

const router = useRouter();
const loading = ref(true);
const tests = ref<TestCatalogItem[]>([]);
const testsError = ref<string | null>(null);

const sectionSummary = (t: TestCatalogItem) => {
  const active = (t.sections ?? []).filter((s) => s.is_active);
  if (!active.length) return "";
  return active.map((s) => `${s.name} (${s.max_time}m)`).join(" · ");
};

const statusBadge = (t: TestCatalogItem) => {
  if (!t.is_active) return "Inactive";
  const s = deriveUserTestState(t);
  if (s === "not_attempted") return "Not attempted";
  if (s === "initialized") return "Initialized";
  if (s === "in_progress") return "In progress";
  if (s === "submitted") return "Submitted";
  if (s === "in_gradding") return "In grading";
  if (s === "graded") return "Graded";
  if (s === "failed") return "Failed";
  return String(t.status ?? "");
};

const cardAction = (t: TestCatalogItem) => {
  if (!t.is_active) return { label: "Unavailable", disabled: true, to: null as unknown };
  if (t.code !== "english") return { label: "Coming soon", disabled: true, to: null as unknown };

  const s = deriveUserTestState(t);

  if (s === "not_attempted") {
    return { label: "Start", disabled: false, to: { name: "test", params: { testId: t.id } } };
  }
  if (s === "in_gradding" || s === "graded") {
    return {
      label: "View results",
      disabled: false,
      to: { name: "results", params: { testId: t.id } },
    };
  }
  return { label: "Unavailable", disabled: true, to: null as unknown };
};

const goCard = (t: TestCatalogItem) => {
  const act = cardAction(t);
  if (!act.to) return;
  router.push(act.to);
};

onMounted(async () => {
  loading.value = true;
  testsError.value = null;
  try {
    tests.value = await testsApi.myTests();
  } catch (e) {
    testsError.value = (e as { message?: string } | undefined)?.message ?? "Failed to load tests";
    tests.value = [];
  }
  loading.value = false;
});
</script>

<template>
  <AppShell>
    <div class="grid gap-6">
      <div>
        <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">DASHBOARD</div>
        <h1 class="mt-2 text-3xl font-extrabold tracking-[-0.6px]">Available Tests</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-white/65">
          Choose a test to begin. For now, each user can take a single attempt.
        </p>
      </div>

      <div
        v-if="testsError"
        class="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
      >
        {{ testsError }}
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          v-for="t in tests"
          :key="t.id"
          class="min-w-0 rounded-3xl border border-white/10 bg-black/25 p-5 backdrop-blur sm:p-6"
          :class="!t.is_active ? 'opacity-70' : ''"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <div class="wrap-break-word text-sm font-extrabold tracking-[-0.2px]">{{ t.name }}</div>
              <div v-if="sectionSummary(t)" class="mt-1 text-xs font-bold text-white/55">
                {{ sectionSummary(t) }}
              </div>
            </div>
            <div
              class="self-start rounded-2xl border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-extrabold tracking-[0.8px]"
            >
              {{ statusBadge(t) }}
            </div>
          </div>

          <p class="mt-4 text-sm leading-6 text-white/65">{{ t.description }}</p>

          <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="text-xs font-semibold text-white/55">Single attempt only</div>
            <AppButton
              class="h-10 w-full px-6 sm:w-auto"
              :disabled="loading || cardAction(t).disabled"
              @click="goCard(t)"
            >
              {{ cardAction(t).label }}
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>
