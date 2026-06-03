<script setup lang="ts">
import { computed, useAttrs } from "vue";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary";
  disabled?: boolean;
  full?: boolean;
}>();

const attrs = useAttrs();

const className = computed(() => {
  const base =
    "h-11 rounded-xl px-5 font-extrabold tracking-[0.1px] transition active:translate-y-px disabled:cursor-not-allowed";

  const width = props.full ? "w-full" : "";

  if ((props.variant ?? "primary") === "secondary") {
    return `${base} ${width} border border-slate-300/60 bg-white/80 text-slate-900/90 shadow-none disabled:opacity-60`;
  }

  return `${base} ${width} border border-black/10 bg-[#ff8a1f] text-black shadow-[0_10px_22px_rgba(0,0,0,0.18),0_1px_0_rgba(255,255,255,0.14)_inset] hover:bg-[#ff993d] hover:shadow-[0_12px_26px_rgba(0,0,0,0.22),0_1px_0_rgba(255,255,255,0.14)_inset] disabled:bg-[#ff8a1f]/70 disabled:text-black/70 disabled:shadow-none disabled:opacity-100`;
});
</script>

<template>
  <button
    v-bind="attrs"
    :class="[className, attrs.class]"
    :type="type ?? 'button'"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
