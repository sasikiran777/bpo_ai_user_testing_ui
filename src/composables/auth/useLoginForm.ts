import { computed, reactive, ref } from "vue";
import { useRegle } from "@regle/core";
import { useAuth } from "@/composables/auth/useAuth";
import { loginRules } from "@/validations/auth/login.validation";
import { useRouter } from "vue-router";

type LoginFormValues = {
  email: string;
  password: string;
};

export const useLoginForm = () => {
  const auth = useAuth();
  const router = useRouter();

  const values = reactive<LoginFormValues>({
    email: "",
    password: "",
  });
  const rememberMe = ref(false);

  const { r$ } = useRegle(values, loginRules);

  const readErrorMessage = (err: unknown) => {
    if (!err) return "";
    if (typeof err === "string") return err;
    if (typeof err === "object" && err && "$message" in err) {
      const msg = (err as { $message?: unknown }).$message;
      return String(msg ?? "");
    }
    return String(err);
  };

  const errors = {
    email: computed(() => (r$.email.$dirty ? readErrorMessage(r$.email.$errors[0]) : "")),
    password: computed(() => (r$.password.$dirty ? readErrorMessage(r$.password.$errors[0]) : "")),
  };

  const touch = (field?: keyof LoginFormValues) => {
    if (field) r$[field].$touch();
    else r$.$touch();
  };

  const canSubmit = computed(
    () => Boolean(values.email.trim()) && Boolean(values.password) && !auth.loading.value,
  );

  const submit = async () => {
    const ok = await r$.$validate();
    if (!ok) {
      r$.$touch();
      return;
    }

    await auth.login(
      { email: values.email.trim(), password: values.password },
      { remember: rememberMe.value },
    );
    router.replace({ name: "dashboard" });
  };

  return {
    values,
    rememberMe,
    errors,
    canSubmit,
    touch,
    submit,
    auth,
    r$,
  };
};
