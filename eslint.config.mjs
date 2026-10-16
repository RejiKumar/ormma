import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

// Matches an import/export source that points into the root shared/ folder.
const SHARED_SOURCE = String.raw`/(^|\/)shared(\/|$)/`;

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/lib/**",
      "**/build/**",
      "**/coverage/**",
      "**/.expo/**",
      "emulator-data/**",
      "mobile/android/**",
      "mobile/ios/**",
      "openspec/**",
      ".claude/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["**/*.mjs", "**/*.cjs", "**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // shared/ is TYPES ONLY: nothing in it may exist at runtime, so Metro and the Functions
  // deploy never need to resolve it.
  {
    files: ["shared/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message: "shared/ is types only: no default exports.",
        },
        {
          selector: "ExportAllDeclaration[exportKind!='type']",
          message: "shared/ is types only: use `export type * from`.",
        },
        {
          selector:
            "ExportNamedDeclaration[exportKind!='type'] > ExportSpecifier[exportKind!='type']",
          message: "shared/ is types only: use `export type { ... }`.",
        },
        {
          selector:
            "Program > :matches(VariableDeclaration, FunctionDeclaration, ClassDeclaration, TSEnumDeclaration, ExpressionStatement)",
          message: "shared/ is types only: no runtime declarations or statements.",
        },
        {
          selector:
            "ExportNamedDeclaration > :matches(VariableDeclaration, FunctionDeclaration, ClassDeclaration, TSEnumDeclaration)",
          message: "shared/ is types only: no runtime exports.",
        },
        {
          selector: "ImportDeclaration[importKind!='type']",
          message: "shared/ is types only: imports must be `import type`.",
        },
      ],
    },
  },
  // Consumers must use a top-level `import type` / `export type` for anything from shared/.
  {
    files: ["mobile/**/*.{ts,tsx}", "functions/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `ImportDeclaration[importKind!='type'][source.value=${SHARED_SOURCE}]`,
          message:
            "Import from shared/ with a top-level `import type` (types only, erased at build).",
        },
        {
          selector: `ExportNamedDeclaration[exportKind!='type'][source.value=${SHARED_SOURCE}]`,
          message: "Re-export from shared/ with `export type` only.",
        },
        {
          selector: `ExportAllDeclaration[exportKind!='type'][source.value=${SHARED_SOURCE}]`,
          message: "Re-export from shared/ with `export type * from` only.",
        },
      ],
    },
  },
  prettier,
);
