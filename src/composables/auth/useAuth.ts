import { computed, ref } from "vue";
import { loginApi, registerApi } from "@/apis/auth/auth.api";
import type { ApiError } from "@/types/api/api.types";
import type { AuthUser, LoginRequest, RegisterRequest } from "@/types/auth/auth.types";

const token = ref<string | null>(localStorage.getItem("auth_token"));
const user = ref<AuthUser | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

export const useAuth = () => {
  const isAuthenticated = computed(() => Boolean(token.value));

  const login = async (payload: LoginRequest) => {
    loading.value = true;
    error.value = null;

    try {
      const res = await loginApi(payload);
      token.value = res.token;
      user.value = { firstName: res.firstName, email: payload.email };
      localStorage.setItem("auth_token", res.token);
      return res;
    } catch (e) {
      const apiError = e as ApiError;
      error.value = apiError.message ?? "Login failed";
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const register = async (payload: RegisterRequest) => {
    loading.value = true;
    error.value = null;

    try {
      const res = await registerApi(payload);
      token.value = res.token;
      user.value = { firstName: res.firstName, email: payload.email };
      localStorage.setItem("auth_token", res.token);
      return res;
    } catch (e) {
      const apiError = e as ApiError;
      error.value = apiError.message ?? "Registration failed";
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem("auth_token");
  };

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
  };
};
