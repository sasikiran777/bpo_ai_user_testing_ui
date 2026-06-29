import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import vueDevTools from "vite-plugin-vue-devtools";
import basicSsl from "@vitejs/plugin-basic-ssl";

const enableHttps = process.env.VITE_DEV_HTTPS === "true";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx(), vueDevTools(), ...(enableHttps ? [basicSsl()] : [])],
  server: {
    host: enableHttps,
    ...(enableHttps ? { https: {} } : {}),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
