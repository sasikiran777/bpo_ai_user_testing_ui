import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "@/composables/auth/useAuth";
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

router.beforeEach((to) => {
  const auth = useAuth();
  if ((to.name === "login" || to.name === "register") && auth.isAuthenticated.value) {
    return { name: "dashboard" };
  }
  if (to.name !== "login" && to.name !== "register" && !auth.isAuthenticated.value) {
    return { name: "login" };
  }
  return true;
});

export default router;
