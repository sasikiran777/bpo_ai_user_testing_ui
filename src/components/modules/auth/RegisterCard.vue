<script setup lang="ts">
import { computed, ref } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppInput from "@/components/ui/AppInput.vue";
import { useRegisterForm } from "@/composables/auth/useRegisterForm";
import { useRouter } from "vue-router";

const router = useRouter();
const { values, errors, canSubmit, touch, submit, auth, phoneDisplay, showCareerFields, countryOptions, positionOptions } =
  useRegisterForm();
const { loading, error } = auth;

const isPositionMenuOpen = ref(false);
const positionSearch = ref(values.desiredPosition);
let closeMenuTimer: number | undefined;

const selectablePositionOptions = computed(() => positionOptions.filter((option) => Boolean(option.value)));
const filteredPositionOptions = computed(() => {
  const query = positionSearch.value.trim().toLowerCase();
  if (!query) return selectablePositionOptions.value;
  return selectablePositionOptions.value.filter((option) => option.label.toLowerCase().includes(query));
});

const clearCloseMenuTimer = () => {
  if (closeMenuTimer) {
    window.clearTimeout(closeMenuTimer);
    closeMenuTimer = undefined;
  }
};

const openPositionMenu = () => {
  clearCloseMenuTimer();
  isPositionMenuOpen.value = true;
};

const closePositionMenu = () => {
  clearCloseMenuTimer();
  closeMenuTimer = window.setTimeout(() => {
    isPositionMenuOpen.value = false;
    touch("desiredPosition");
  }, 120);
};

const onPositionSearchInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  positionSearch.value = value;
  values.desiredPosition = value;
  isPositionMenuOpen.value = true;
};

const selectDesiredPosition = (value: string, label: string) => {
  clearCloseMenuTimer();
  values.desiredPosition = label;
  positionSearch.value = label;
  isPositionMenuOpen.value = false;
  touch("desiredPosition");
};
</script>

<template>
  <div class="w-full max-w-full lg:max-w-120">
    <div class="mb-7">
      <div class="text-2xl font-extrabold tracking-[-0.4px] text-slate-900">Create account</div>
      <div class="mt-2 text-sm leading-6 text-slate-600">Register to start your assessment.</div>
    </div>

    <form class="grid gap-4" @submit.prevent="submit()">
      <div class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <AppInput v-model="values.firstName" label="First name" placeholder="First name" :error="errors.firstName.value" @blur="touch('firstName')" />
        <AppInput v-model="values.middleName" label="Middle name" placeholder="Middle name (optional)" @blur="touch('middleName')" />
        <AppInput v-model="values.lastName" label="Last name" placeholder="Last name" :error="errors.lastName.value" @blur="touch('lastName')" />
      </div>

      <div class="grid gap-4 2xl:grid-cols-2">
        <div class="grid gap-4 md:grid-cols-[9rem_minmax(0,1fr)]">
          <div class="grid min-w-0 gap-1.5">
            <label class="text-[13px] font-semibold text-[rgba(15,23,42,0.85)]" for="register-country-code">Country code</label>
            <select
              id="register-country-code"
              v-model="values.countryCode"
              class="h-10.5 w-full min-w-0 rounded-xl border bg-white px-3 text-[#0f172a] outline-none transition focus:ring-0"
              @blur="touch('countryCode')"
            >
              <option v-for="option in countryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <AppInput
            v-model="phoneDisplay"
            label="Phone"
            placeholder="Phone"
            autocomplete="tel-national"
            :error="errors.phone.value"
            @blur="touch('phone')"
          />
        </div>
        <AppInput
          v-model="values.email"
          label="Email"
          type="email"
          placeholder="Email"
          autocomplete="email"
          :error="errors.email.value"
          @blur="touch('email')"
        />
      </div>

      <Transition name="career-section">
        <div v-if="showCareerFields" class="career-section grid gap-4">
        <div class="position-search grid gap-1.5">
            <label class="text-[13px] font-semibold text-[rgba(15,23,42,0.85)]" for="register-position-desired">Type of position desired</label>
            <input
              id="register-position-desired"
              :value="positionSearch"
              type="text"
              autocomplete="off"
              placeholder="Search desired position"
              class="h-10.5 w-full min-w-0 rounded-xl border bg-white px-3 text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:ring-0"
              role="combobox"
              aria-autocomplete="list"
              :aria-expanded="isPositionMenuOpen"
              aria-controls="register-position-options"
              @focus="openPositionMenu"
              @input="onPositionSearchInput"
              @blur="closePositionMenu"
            />
            <div
              v-if="isPositionMenuOpen"
              id="register-position-options"
              class="absolute left-0 right-0 top-full z-20 mt-2 max-h-56 overflow-auto rounded-xl border bg-white py-1 shadow-lg"
              role="listbox"
            >
              <button
                v-for="option in filteredPositionOptions"
                :key="option.value"
                type="button"
                class="block w-full px-3 py-2 text-left text-sm text-[#0f172a] hover:bg-slate-50"
                role="option"
                :aria-selected="values.desiredPosition === option.value"
                @mousedown.prevent="selectDesiredPosition(option.value, option.label)"
              >
                {{ option.label }}
              </button>
              <div v-if="!filteredPositionOptions.length" class="px-3 py-2 text-sm text-slate-500">No positions found</div>
            </div>
          </div>
          <AppInput
            v-model="values.totalExpMonths"
            label="Experience (months)"
            type="number"
            placeholder="Optional"
            :error="errors.totalExpMonths.value"
            @blur="touch('totalExpMonths')"
          />
        </div>
      </Transition>

      <div class="flex flex-col items-start gap-3 pt-0.5 sm:flex-row sm:items-center sm:justify-between">
        <a class="text-[13px] font-bold text-[#ff8a1f] hover:underline" href="#" @click.prevent="router.push({ name: 'login' })">
          Already have an account?
        </a>
      </div>

      <div
        v-if="error"
        class="rounded-xl border border-red-500/30 bg-red-100/60 px-3 py-2.5 text-[13px] font-semibold text-red-800"
      >
        {{ error }}
      </div>

      <AppButton full class="mt-2" type="submit" :disabled="!canSubmit || loading">
        <span v-if="loading">Creating account...</span>
        <span v-else>Start now!</span>
      </AppButton>
    </form>
  </div>
</template>

<style scoped>
.career-section {
  overflow: hidden;
  transform-origin: top;
}

.career-section-enter-active,
.career-section-leave-active {
  transition:
    max-height 0.32s ease,
    opacity 0.24s ease,
    transform 0.32s ease,
    margin 0.32s ease;
}

.career-section-enter-from,
.career-section-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-8px) scaleY(0.98);
}

.career-section-enter-to,
.career-section-leave-from {
  max-height: 18rem;
  opacity: 1;
  transform: translateY(0) scaleY(1);
}

.position-search {
  position: relative;
}
</style>
