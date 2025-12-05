# ESLint Setup Instructions

This PR adds ESLint configuration and GitHub Actions CI workflow. After merging, follow these steps:

## 1. Install Dependencies

Run the following command to install the required ESLint packages:

```bash
npm install --save-dev \
  eslint@^8.0.0 \
  @typescript-eslint/eslint-plugin@^6.0.0 \
  @typescript-eslint/parser@^6.0.0 \
  eslint-plugin-jest@^27.0.0 \
  jest-junit@^16.0.0
```

## 2. Run Linter

Check for linting issues:

```bash
npm run lint
```

## 3. Fix Linting Issues

Most issues can be auto-fixed:

```bash
npm run lint:fix
```

For remaining issues, manually review and fix according to ESLint rules.

## 4. Update Workflow

The CI workflow is configured to run on the `main` branch. If you want to enable it for other branches, edit `.github/workflows/ci.yml` and update the `branches` section.

## 5. Common ESLint Rules

The configuration includes:

- **@typescript-eslint/no-unused-vars**: Error for unused variables (use `_` prefix for intentionally unused)
- **@typescript-eslint/no-explicit-any**: Warning for `any` types (minimize usage)
- **@typescript-eslint/no-non-null-assertion**: Warning for `!` assertions (use type guards instead)
- **Type checking**: Requires type information for advanced checks

## 6. CI Badge

The README now includes a CI status badge:

[![CI](https://github.com/neumaennl/vscode-visual-xml-schema-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/neumaennl/vscode-visual-xml-schema-editor/actions/workflows/ci.yml)

This will show the build status once the workflow runs.

## 7. Files Added/Modified

- `.eslintrc.json` - ESLint configuration
- `.eslintignore` - Files to ignore during linting
- `.github/workflows/ci.yml` - GitHub Actions CI workflow
- `package.json` - Added lint scripts and dev dependencies
- `jest.config.js` - Added jest-junit reporter for CI
- `README.md` - Added CI badge
- `docs/DEVELOPMENT_GUIDELINES.md` - Added linting and CI documentation

## 8. Next Steps

1. Merge this PR
2. Run `npm install` to get the new dependencies
3. Run `npm run lint:fix` to auto-fix issues
4. Address remaining linting issues
5. Commit the fixes
6. Push to trigger the CI workflow

## Notes

- The linter is configured to ignore generated files (`**/generated/**`)
- Test files are checked by ESLint to ensure consistency
- The CI workflow requires all checks to pass before merging
