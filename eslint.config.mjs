import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Tipado progresivo en código legacy: reporta como advertencia sin ocultar errores reales de React/TS
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Entornos externos, compilados Android, motor ML y scripts CommonJS legacy:
    ".venv/**",
    "android/**",
    "ml_engine/**",
    "storage_vol/**",
    "prisma/*.js",
    "seed_workers.js",
  ]),
]);

export default eslintConfig;
