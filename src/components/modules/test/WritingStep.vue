<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { computed } from 'vue'

type WritingValues = {
  aboutMe: string
  location: string
  experience: string
  roles: string
  responsibilities: string
  other: string
}

const props = defineProps<{
  timerLabel: string
  timerValue: string
  disabled?: boolean
  values: WritingValues
}>()

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'update:values', values: WritingValues): void
}>()

const updateField = <K extends keyof WritingValues>(key: K, value: WritingValues[K]) => {
  emit('update:values', { ...props.values, [key]: value })
}

const aboutMe = computed({
  get: () => props.values.aboutMe,
  set: (v: string) => updateField('aboutMe', v),
})

const location = computed({
  get: () => props.values.location,
  set: (v: string) => updateField('location', v),
})

const experience = computed({
  get: () => props.values.experience,
  set: (v: string) => updateField('experience', v),
})

const roles = computed({
  get: () => props.values.roles,
  set: (v: string) => updateField('roles', v),
})

const responsibilities = computed({
  get: () => props.values.responsibilities,
  set: (v: string) => updateField('responsibilities', v),
})

const other = computed({
  get: () => props.values.other,
  set: (v: string) => updateField('other', v),
})
</script>

<template>
  <div class="grid gap-6 rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">SECTION 1</div>
        <h2 class="mt-1 text-xl font-extrabold tracking-[-0.3px]">Writing (5 minutes)</h2>
        <p class="mt-1 text-sm text-white/65">
          Write about yourself. Try to be clear and detailed. Auto-submits when time ends.
        </p>
      </div>
    </div>

    <div class="grid gap-4">
      <div class="grid gap-1.5">
        <label class="text-[13px] font-semibold text-white/80">Tell us about yourself</label>
        <textarea
          v-model="aboutMe"
          class="min-h-22 w-full resize-none rounded-2xl border border-white/10 bg-white/95 px-3 py-2.5 text-sm text-[#0f172a] outline-none"
          placeholder="A short introduction about you..."
        />
      </div>

      <div class="grid gap-1.5">
        <label class="text-[13px] font-semibold text-white/80">Where are you from?</label>
        <textarea
          v-model="location"
          class="min-h-16 w-full resize-none rounded-2xl border border-white/10 bg-white/95 px-3 py-2.5 text-sm text-[#0f172a] outline-none"
          placeholder="City / country..."
        />
      </div>

      <div class="grid gap-1.5">
        <label class="text-[13px] font-semibold text-white/80">Experience summary</label>
        <textarea
          v-model="experience"
          class="min-h-18 w-full resize-none rounded-2xl border border-white/10 bg-white/95 px-3 py-2.5 text-sm text-[#0f172a] outline-none"
          placeholder="Your experience, industries, years..."
        />
      </div>

      <div class="grid gap-1.5">
        <label class="text-[13px] font-semibold text-white/80">Roles you worked in</label>
        <textarea
          v-model="roles"
          class="min-h-18 w-full resize-none rounded-2xl border border-white/10 bg-white/95 px-3 py-2.5 text-sm text-[#0f172a] outline-none"
          placeholder="Roles and teams..."
        />
      </div>

      <div class="grid gap-1.5">
        <label class="text-[13px] font-semibold text-white/80">Responsibilities</label>
        <textarea
          v-model="responsibilities"
          class="min-h-18 w-full resize-none rounded-2xl border border-white/10 bg-white/95 px-3 py-2.5 text-sm text-[#0f172a] outline-none"
          placeholder="What you owned, tools used, outcomes..."
        />
      </div>

      <div class="grid gap-1.5">
        <label class="text-[13px] font-semibold text-white/80">Anything else?</label>
        <textarea
          v-model="other"
          class="min-h-16 w-full resize-none rounded-2xl border border-white/10 bg-white/95 px-3 py-2.5 text-sm text-[#0f172a] outline-none"
          placeholder="Optional..."
        />
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
