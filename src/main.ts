import "./assets/main.css";

import { createApp } from "vue";
import { RegleVuePlugin } from "@regle/core";

import App from "./App.vue";
import router from "./router";

const app = createApp(App);

app.use(RegleVuePlugin);
app.use(router);

app.mount("#app");
