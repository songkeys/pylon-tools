import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: ["ai", "zod"],
  },
  dts: true,
  entry: ["src/index.ts"],
  fixedExtension: true,
  format: ["esm"],
  sourcemap: true,
  target: "es2022",
});
