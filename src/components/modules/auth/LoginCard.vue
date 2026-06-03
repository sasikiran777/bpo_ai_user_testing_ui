<script setup lang="ts">
import AppButton from "@/components/ui/AppButton.vue";
import AppCheckbox from "@/components/ui/AppCheckbox.vue";
import AppInput from "@/components/ui/AppInput.vue";
import { useLoginForm } from "@/composables/auth/useLoginForm";

const { values, errors, rememberMe, canSubmit, touch, submit, auth } = useLoginForm();
const { loading, error } = auth;
</script>

<template>
  <div class="w-full max-w-95">
    <div class="mb-7">
      <div class="text-2xl font-extrabold tracking-[-0.4px] text-slate-900">Sign in</div>
      <div class="mt-2 text-sm leading-6 text-slate-600">
        Use your work email to access the portal.
      </div>
    </div>

    <form class="grid gap-4" @submit.prevent="submit()">
      <AppInput
        v-model="values.email"
        label="Email"
        type="email"
        placeholder="Email"
        autocomplete="email"
        :error="errors.email.value"
        @blur="touch('email')"
      />

      <AppInput
        v-model="values.password"
        label="Password"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
        :error="errors.password.value"
        @blur="touch('password')"
      />

      <div class="flex items-center justify-between gap-3 pt-0.5">
        <a class="text-[13px] font-bold text-[#ff8a1f] hover:underline" href="#" @click.prevent>
          Forgot password?
        </a>
        <AppCheckbox v-model="rememberMe" label="Remember me" />
      </div>

      <div
        v-if="error"
        class="rounded-xl border border-red-500/30 bg-red-100/60 px-3 py-2.5 text-[13px] font-semibold text-red-800"
      >
        {{ error }}
      </div>

      <AppButton full class="mt-2" type="submit" :disabled="!canSubmit || loading">
        <span v-if="loading">Signing in...</span>
        <span v-else>Login</span>
      </AppButton>

      <div class="pt-2 text-center text-xs text-slate-500">
        Having trouble?
        <a class="font-bold text-[#ff8a1f] hover:underline" href="#" @click.prevent>
          Contact your administrator
        </a>
      </div>
    </form>
  </div>
</template>
