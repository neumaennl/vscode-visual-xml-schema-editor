# Generate package-lock.json

This file documents the need to generate `package-lock.json` after merging this PR.

## Why package-lock.json is Not Included in This PR

The project depends on `@neumaennl/xmlbind-ts` from GitHub Packages, which requires authentication to access. The CI environment running this PR does not have access to the authentication token needed to install this package.

## How to Generate package-lock.json After Merge

After merging this PR, follow these steps:

### 1. Configure Authentication

Set up authentication for GitHub Packages using one of these methods:

**Option A: npm login (Recommended)**
```bash
npm login --scope=@neumaennl --registry=https://npm.pkg.github.com
```
Use your GitHub Personal Access Token (with `read:packages` scope) as the password.

**Option B: Environment Variable**
```bash
export NODE_AUTH_TOKEN=your_github_personal_access_token
```

**Option C: ~/.npmrc**
```
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

### 2. Install Dependencies

```bash
npm install
```

This will:
- Install all dependencies
- Generate `package-lock.json`
- Set up the project for development

### 3. Commit package-lock.json

```bash
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

## Creating a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select the `read:packages` scope
4. Generate and save the token

## CI/CD Note

The GitHub Actions workflow will work without issue because it uses `${{ secrets.GITHUB_TOKEN }}`, which GitHub provides automatically with the necessary permissions.
