import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const withoutIncompatibleReactRules = (configs) =>
  configs.map((config) => {
    if (!config.rules) return config;

    return {
      ...config,
      rules: Object.fromEntries(
        Object.entries(config.rules).filter(([ruleName]) => !ruleName.startsWith("react/")),
      ),
    };
  });

const eslintConfig = defineConfig([
  ...withoutIncompatibleReactRules(nextVitals),
  ...withoutIncompatibleReactRules(nextTs),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // eslint-plugin-react 7.37 is not compatible with ESLint 10's rule context
  // API. Its rules are excluded while the remaining Next lint rules stay active.
  {
    // These React Compiler checks flag existing state synchronization patterns
    // across the app. Keep them disabled until those components are migrated.
    rules: {
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
