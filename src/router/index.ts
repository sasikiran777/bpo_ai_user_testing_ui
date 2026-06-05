import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "@/composables/auth/useAuth";
import { testsApi } from "@/apis/test/tests.api";
import { deriveUserTestState } from "@/utils/userTestStatus";
import LoginView from "@/views/auth/LoginView.vue";
import RegisterView from "@/views/auth/RegisterView.vue";
import DashboardView from "@/views/test/DashboardView.vue";
import TestFlowView from "@/views/test/TestFlowView.vue";
import ResultsView from "@/views/test/ResultsView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: { name: "login" },
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
      path: "/register",
      name: "register",
      component: RegisterView,
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: DashboardView,
    },
    {
      path: "/test/:testId",
      name: "test",
      component: TestFlowView,
    },
    {
      path: "/results/:testId",
      name: "results",
      component: ResultsView,
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuth();
  if ((to.name === "login" || to.name === "register") && auth.isAuthenticated.value) {
    return { name: "dashboard" };
  }
  if (to.name !== "login" && to.name !== "register" && !auth.isAuthenticated.value) {
    return { name: "login" };
  }

  if (to.name === "test" || to.name === "results") {
    const testId = String(to.params.testId ?? "");
    if (!testId) return { name: "dashboard" };

    try {
      const tests = await testsApi.myTests();
      const t = tests.find((x) => x.id === testId);
      if (!t || !t.is_active || t.code !== "english") return { name: "dashboard" };

      const s = deriveUserTestState(t);
      if (to.name === "test") {
        if (s !== "not_attempted") return { name: "dashboard" };
      }
      if (to.name === "results") {
        if (s !== "in_gradding" && s !== "gradded") return { name: "dashboard" };
      }
    } catch {
      return { name: "dashboard" };
    }
  }

  return true;
});

export default router;
