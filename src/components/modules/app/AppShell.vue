<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { useAuth } from '@/composables/auth/useAuth'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

defineProps<{
  logoutDisabled?: boolean
}>()

const auth = useAuth()
const router = useRouter()

const displayName = computed(() => auth.user.value?.firstName ?? auth.user.value?.email ?? 'User')

const logout = () => {
  auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-[#060606] text-white">
    <header class="sticky top-0 z-20 border-b border-white/10 bg-black/35 backdrop-blur">
      <div class="mx-auto flex w-full max-w-270 items-center justify-between gap-4 px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="grid h-10 w-10 place-items-center rounded-xl bg-white">
            <span class="text-sm font-black tracking-tight text-black">BPO</span>
          </div>
          <div class="leading-tight">
            <div class="text-sm font-extrabold tracking-[-0.2px]">
              BPO <span class="text-white/65">AI User Testing</span>
            </div>
            <div class="text-xs font-bold text-white/60">{{ displayName }}</div>
          </div>
        </div>

        <AppButton variant="secondary" class="h-9 px-4 text-sm" :disabled="logoutDisabled" @click="logout"
          >Logout</AppButton
        >
      </div>
    </header>

    <main class="mx-auto w-full max-w-270 px-4 py-8">
      <slot />
    </main>
  </div>
</template>
