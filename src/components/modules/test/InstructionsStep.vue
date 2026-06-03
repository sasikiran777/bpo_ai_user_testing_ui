<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { computed, onMounted, ref } from 'vue'

defineProps<{
  title: string
  bullets: string[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'start'): void
}>()

type MicStatus = 'unknown' | 'checking' | 'granted' | 'denied' | 'unsupported'

const micStatus = ref<MicStatus>('unknown')
const micError = ref<string | null>(null)

const startDisabled = computed(() => micStatus.value !== 'granted')

const statusLabel = computed(() => {
  if (micStatus.value === 'checking') return 'Checking…'
  if (micStatus.value === 'granted') return 'Granted'
  if (micStatus.value === 'denied') return 'Denied'
  if (micStatus.value === 'unsupported') return 'Not supported'
  return 'Required'
})

const statusClass = computed(() => {
  if (micStatus.value === 'granted') return 'text-emerald-200'
  if (micStatus.value === 'denied') return 'text-red-200'
  if (micStatus.value === 'unsupported') return 'text-red-200'
  if (micStatus.value === 'checking') return 'text-white/75'
  return 'text-[#ff8a1f]'
})

const stopStream = (stream: MediaStream) => {
  stream.getTracks().forEach((t) => t.stop())
}

const requestMicrophoneAccess = async () => {
  micError.value = null
  if (!navigator.mediaDevices?.getUserMedia) {
    micStatus.value = 'unsupported'
    micError.value = 'This browser does not support microphone access.'
    return
  }
  micStatus.value = 'checking'
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stopStream(stream)
    micStatus.value = 'granted'
  } catch (e) {
    micStatus.value = 'denied'
    micError.value = e instanceof Error ? e.message : 'Microphone permission denied.'
  }
}

const syncInitialPermission = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    micStatus.value = 'unsupported'
    return
  }
  const perms = navigator.permissions
  if (!perms?.query) return

  try {
    const p = await perms.query({ name: 'microphone' as PermissionName })
    micStatus.value = p.state === 'granted' ? 'granted' : p.state === 'denied' ? 'denied' : 'unknown'
    p.addEventListener('change', () => {
      micStatus.value = p.state === 'granted' ? 'granted' : p.state === 'denied' ? 'denied' : 'unknown'
    })
  } catch {
    micStatus.value = 'unknown'
  }
}

onMounted(() => {
  void syncInitialPermission()
})
</script>

<template>
  <div class="grid gap-6 rounded-3xl border border-white/10 bg-black/25 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur">
    <div>
      <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">INSTRUCTIONS</div>
      <h1 class="mt-2 text-2xl font-extrabold tracking-[-0.4px]">{{ title }}</h1>
      <p class="mt-2 text-sm text-white/65">
        Please read carefully before starting. Once you start, leaving the test will lock your attempt.
      </p>
    </div>

    <ul class="grid gap-2 text-sm text-white/75">
      <li v-for="b in bullets" :key="b" class="flex gap-2">
        <span class="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-[#ff8a1f]" />
        <span>{{ b }}</span>
      </li>
    </ul>

    <div class="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm font-semibold text-white/80">
          Microphone access:
          <span class="ml-1 font-extrabold" :class="statusClass">{{ statusLabel }}</span>
        </div>
        <AppButton
          v-if="micStatus !== 'granted'"
          variant="secondary"
          class="h-10 px-6"
          :disabled="micStatus === 'checking'"
          @click="requestMicrophoneAccess"
        >
          Enable Microphone
        </AppButton>
      </div>

      <div v-if="micError" class="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {{ micError }}
      </div>
    </div>

    <div class="flex items-center justify-end gap-3">
      <AppButton class="h-10 px-6" :disabled="loading || startDisabled" @click="emit('start')">Start</AppButton>
    </div>
  </div>
</template>
