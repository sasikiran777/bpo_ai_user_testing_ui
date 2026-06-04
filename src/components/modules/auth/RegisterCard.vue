<script setup lang="ts">
import AppButton from "@/components/ui/AppButton.vue";
import AppInput from "@/components/ui/AppInput.vue";
import { useRegisterForm } from "@/composables/auth/useRegisterForm";
import { useRouter } from "vue-router";

const router = useRouter();
const { values, skillsText, errors, canSubmit, touch, submit, auth } = useRegisterForm();
const { loading, error } = auth;
</script>

<template>
  <div class="w-full max-w-120">
    <div class="mb-7">
      <div class="text-2xl font-extrabold tracking-[-0.4px] text-slate-900">Create account</div>
      <div class="mt-2 text-sm leading-6 text-slate-600">Register to start your assessment.</div>
    </div>

    <form class="grid gap-4" @submit.prevent="submit()">
      <div class="grid gap-4 sm:grid-cols-2">
        <AppInput v-model="values.firstName" label="First name" placeholder="First name" :error="errors.firstName.value" @blur="touch('firstName')" />
        <AppInput v-model="values.lastName" label="Last name" placeholder="Last name" :error="errors.lastName.value" @blur="touch('lastName')" />
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <AppInput v-model="values.phone" label="Phone" placeholder="Phone" autocomplete="tel" :error="errors.phone.value" @blur="touch('phone')" />
        <AppInput v-model="values.totalExpMonths" label="Total exp (months)" type="number" placeholder="0" :error="errors.totalExpMonths.value" @blur="touch('totalExpMonths')" />
      </div>

      <AppInput v-model="values.email" label="Email" type="email" placeholder="Email" autocomplete="email" :error="errors.email.value" @blur="touch('email')" />

      <AppInput v-model="values.password" label="Password" type="password" placeholder="Password" autocomplete="new-password" :error="errors.password.value" @blur="touch('password')" />

      <AppInput
        v-model="skillsText"
        label="Skills"
        placeholder="Example: English, Customer support, CRM"
        :error="errors.skills.value"
        @blur="touch('skills')"
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <AppInput v-model="values.pastJobTitle" label="Past job title" placeholder="Optional" @blur="touch('pastJobTitle')" />
        <AppInput v-model="values.company" label="Company" placeholder="Optional" @blur="touch('company')" />
      </div>

      <div class="flex items-center justify-between gap-3 pt-0.5">
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
        <span v-else>Register</span>
      </AppButton>
    </form>
  </div>
</template>
