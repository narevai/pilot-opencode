import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 100,
  ignorePatterns: ["node_modules/**", ".eve/**", ".output/**", ".nitro/**", "dist/**"],
});
