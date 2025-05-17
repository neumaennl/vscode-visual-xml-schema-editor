import js from "@eslint/js";
import tseslint from "typescript-eslint";


export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: [
            '**/out/**',
            '**/dist/**',
            '**/node_modules/**'
        ],
        rules: {
            'semi': ['error', 'always'],
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off'
        }
    }
);
