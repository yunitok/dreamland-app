import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    // Agent/skill files — not project source code
    ".agent/**",
    ".claude/**",
    // Prisma migration/seed scripts — utility scripts, not production code
    "prisma/**",
    // Utility scripts
    "scripts/**",
  ]),
  // Strict rules for better code quality
  {
    rules: {
      // Enforce consistent returns
      "consistent-return": "warn",
      // Warn on unused variables
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      // Prefer const
      "prefer-const": "error",
      // No console.log in production (warn only)
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Enforce React hooks rules
      "react-hooks/exhaustive-deps": "warn",
      // Prefer arrow functions for components
      "react/function-component-definition": ["warn", {
        namedComponents: "function-declaration",
        unnamedComponents: "arrow-function"
      }],
    },
  },
]);

export default eslintConfig;

