import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const pkg = (name: string) =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

// テストは dist を介さず各パッケージの src を直接参照する
export default defineConfig({
  resolve: {
    alias: {
      "@yadeck/slide-schema": pkg("slide-schema"),
      "@yadeck/slide-core": pkg("slide-core"),
      "@yadeck/slide-components-basic": pkg("slide-components-basic"),
    },
  },
  test: {
    include: ["packages/*/src/**/*.test.{ts,tsx}"],
  },
});
