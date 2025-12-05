# ESLint Setup Instructions

This PR adds ESLint configuration and GitHub Actions CI workflow. After merging, follow these steps:

## 1. Configure GitHub Packages Authentication

This project depends on `@neumaennl/xmlbind-ts` from GitHub Packages, which requires authentication.

### Option A: npm login (Recommended for Local Development)

```bash
npm login --scope=@neumaennl --registry=https://npm.pkg.github.com
```

When prompted:
- **Username**: Your GitHub username
- **Password**: Your GitHub Personal Access Token (PAT) with `read:packages` scope
- **Email**: Your GitHub email

### Option B: Environment Variable (CI/CD or Temporary)

```bash
export NODE_AUTH_TOKEN=your_github_personal_access_token
npm install
```

### Option C: .npmrc in Home Directory

Create or edit `~/.npmrc`:
```
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

### Creating a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "npm packages")
4. Select the `read:packages` scope
5. Click "Generate token"
6. Copy the token (you won't see it again!)

## 2. Generate package-lock.json

After configuring authentication:

```bash
npm install
```

This will:
- Install all dependencies
- Generate `package-lock.json` (which should be committed to the repository)
- Ensure reproducible builds across environments

**Note**: The `.npmrc` no longer contains `package-lock=false`, so `package-lock.json` will be created and should be committed.

## 3. Run Linter

Check for linting issues:

```bash
npm run lint
```

**Note**: The linter now checks both extension code (`src/`) and webview code (`webview-src/`).

## 4. Fix Linting Issues

Most issues can be auto-fixed:

```bash
npm run lint:fix
```

For remaining issues, manually review and fix according to ESLint rules.

## 5. Update Workflow

The CI workflow is configured to run on the `main` branch. If you want to enable it for other branches, edit `.github/workflows/ci.yml` and update the `branches` section.

## 6. Common ESLint Rules

The configuration includes:

- **@typescript-eslint/no-unused-vars**: Error for unused variables (use `_` prefix for intentionally unused)
- **@typescript-eslint/no-explicit-any**: Warning for `any` types (minimize usage)
- **@typescript-eslint/no-non-null-assertion**: Warning for `!` assertions (use type guards instead)
- **Type checking**: Requires type information for advanced checks

## 7. CI Badge

The README now includes a CI status badge:

[![CI](https://github.com/neumaennl/vscode-visual-xml-schema-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/neumaennl/vscode-visual-xml-schema-editor/actions/workflows/ci.yml)

This will show the build status once the workflow runs.

## 8. Files Added/Modified

- `.eslintrc.json` - ESLint configuration
- `.eslintignore` - Files to ignore during linting
- `.github/workflows/ci.yml` - GitHub Actions CI workflow
- `package.json` - Added lint scripts and dev dependencies
- `jest.config.js` - Added jest-junit reporter for CI
- `README.md` - Added CI badge
- `docs/DEVELOPMENT_GUIDELINES.md` - Added linting and CI documentation

## 9. Next Steps

1. Merge this PR
2. Configure GitHub Packages authentication (see section 1)
3. Run `npm install` to get the new dependencies and generate `package-lock.json`
4. Commit `package-lock.json` to the repository
5. Run `npm run lint:fix` to auto-fix issues
6. Address remaining linting issues
7. Commit the fixes
8. Push to trigger the CI workflow

## Notes

- The linter now checks both extension code (`src/`) and webview code (`webview-src/`)
- The linter is configured to ignore generated files (`**/generated/**`)
- Test files are checked by ESLint to ensure consistency
- The CI workflow requires all checks to pass before merging
- CI automatically authenticates using `${{ secrets.GITHUB_TOKEN }}` provided by GitHub Actions
