import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { configDefaults } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    // Simule un navigateur pour Vue.js
    environment: "jsdom",

    // Ignore le dossier server (car c'est Jest qui s'en occupe)
    exclude: [...configDefaults.exclude, "server/**"],

    // Permet d'utiliser describe/it/expect sans les importer partout
    globals: true,
  },
});
