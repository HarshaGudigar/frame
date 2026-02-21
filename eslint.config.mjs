import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { files: ["**/*.js", "**/*.mjs", "**/*.ts", "**/*.tsx"], languageOptions: { sourceType: "module" } },
    { languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.jest } } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-explicit-any": "warn"
        }
    }
);
