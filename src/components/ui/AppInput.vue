<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  modelValue: string;
  label: string;
  type?: string;
  placeholder?: string;
  name?: string;
  id?: string;
  autocomplete?: string;
  error?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "blur"): void;
}>();

const inputId = computed(() => {
  if (props.id) return props.id;
  if (props.name) return props.name;
  return `field-${props.label.toLowerCase().replaceAll(/\s+/g, "-")}`;
});

const inputType = computed(() => (props.type === "email" ? "text" : (props.type ?? "text")));
const inputMode = computed(() => (props.type === "email" ? "email" : undefined));

const onKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.code === "KeyA") {
    const el = e.target as HTMLInputElement | null;
    el?.select();
    e.stopPropagation();
    e.preventDefault();
  }
};
</script>

<template>
  <div class="grid gap-1.5">
    <label class="text-[13px] font-semibold text-[rgba(15,23,42,0.85)]" :for="inputId">{{
      label
    }}</label>
    <input
      class="h-10.5 rounded-xl border bg-white px-3 text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:ring-0 selection:bg-[#ff8a1f]/45 selection:text-[#0f172a]"
      :id="inputId"
      :name="name"
      :type="inputType"
      :inputmode="inputMode"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      data-app-input
      :data-error="Boolean(error)"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="emit('blur')"
      @keydown="onKeydown"
    />
    <div v-if="error" class="text-xs font-medium text-[#b91c1c]">{{ error }}</div>
  </div>
</template>
