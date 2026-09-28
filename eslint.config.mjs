import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The collectors read loosely-typed JSON from outside APIs; `any` is deliberate there.
  { rules: { "@typescript-eslint/no-explicit-any": "off", "@next/next/no-page-custom-font": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/report/**",
    "src/lib/report-template.generated.ts",
  ]),
]);

export default eslintConfig;
