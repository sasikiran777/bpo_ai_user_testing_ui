<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label: string
  name?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>

<template>
  <label class="inline-flex cursor-pointer select-none items-center gap-2.5">
    <input
      class="h-4 w-4 accent-[#ff8a1f]"
      type="checkbox"
      :name="name"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="text-[13px] text-slate-900/70">{{ label }}</span>
  </label>
</template>
