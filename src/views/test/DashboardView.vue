<script setup lang="ts">
import AppShell from "@/components/modules/app/AppShell.vue";
import AppButton from "@/components/ui/AppButton.vue";
import { testApi } from "@/apis/test/test.api";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import type { TestSession } from "@/types/test/test.types";

const router = useRouter();
const session = ref<TestSession | null>(null);
const loading = ref(true);

const statusLabel = computed(() => {
  const s = session.value;
  if (!s) return "Loading";
  if (s.status === "not_started") return "Not started";
  if (s.status === "in_progress") return "In progress";
  if (s.status === "grading") return "Grading";
  if (s.status === "completed") return "Completed";
  if (s.status === "failed") return "Failed";
  return s.status;
});

const primaryAction = computed(() => {
  const s = session.value;
  if (!s) return { label: "Loading", to: null as unknown, disabled: true };
  if (s.status === "not_started" || s.status === "in_progress") {
    return {
      label: s.status === "in_progress" ? "Continue" : "Start",
      to: { name: "test", params: { testType: "english" } },
      disabled: false,
    };
  }
  return {
    label: "View results",
    to: { name: "results", params: { testType: "english" } },
    disabled: false,
  };
});

const goPrimary = () => {
  if (!primaryAction.value.to) return;
  router.push(primaryAction.value.to);
};

onMounted(async () => {
  loading.value = true;
  session.value = await testApi.getOrCreateSession("english");
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

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-sm font-extrabold tracking-[-0.2px]">English Skills Test</div>
              <div class="mt-1 text-xs font-bold text-white/55">
                Writing (5m) · Reading (5m) · Speaking (3m)
              </div>
            </div>
            <div
              class="rounded-2xl border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-extrabold tracking-[0.8px]"
            >
              {{ statusLabel }}
            </div>
          </div>

          <p class="mt-4 text-sm leading-6 text-white/65">
            Measures real-world English communication with timed writing, comprehension, and
            speaking.
          </p>

          <div class="mt-6 flex items-center justify-between gap-3">
            <div class="text-xs font-semibold text-white/55">Single attempt only</div>
            <AppButton
              class="h-10 px-6"
              :disabled="loading || primaryAction.disabled"
              @click="goPrimary"
            >
              {{ primaryAction.label }}
            </AppButton>
          </div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-black/15 p-6 opacity-70">
          <div class="text-sm font-extrabold tracking-[-0.2px]">Agentic AI Testing</div>
          <div class="mt-1 text-xs font-bold text-white/55">Coming soon</div>
          <p class="mt-4 text-sm leading-6 text-white/65">
            Future module for agentic AI workflows and scenario-based testing.
          </p>
          <div class="mt-6 flex items-center justify-end">
            <AppButton class="h-10 px-6" disabled>Unavailable</AppButton>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>
