import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "unicorn", "oxc", "import", "node"],
  categories: {
    correctness: "error",
    suspicious: "warn",
  },
  env: {
    node: true,
  },
  ignorePatterns: ["node_modules", ".eve", ".output", ".nitro", "dist"],
  options: {
    typeAware: true,
  },
});
