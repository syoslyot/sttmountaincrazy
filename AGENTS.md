<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:git-workflow-rules -->
# Git Flow + Conventional Commits

## Branch model (Git Flow)

| Branch | Purpose | Branch from | Merge into |
|--------|---------|-------------|------------|
| `main` | production-ready, protected | — | — |
| `develop` | integration, protected | `main` | `main` (via release) |
| `feature/<scope>-<short-desc>` | new feature | `develop` | `develop` |
| `fix/<scope>-<short-desc>` | bug fix | `develop` | `develop` |
| `release/<version>` | release prep | `develop` | `main` + `develop` |
| `hotfix/<short-desc>` | urgent prod fix | `main` | `main` + `develop` |

**Never commit directly to `main` or `develop`.**

## Commit message (Conventional Commits)

```
<type>(<scope>): <subject>   ← max 72 chars

[optional body: explain WHY, not WHAT]
```

Allowed types: `feat` `fix` `refactor` `test` `docs` `chore`  
Scope: component or area affected (e.g. `map`, `riso`, `ui`, `claude`)

Examples:
```
feat(map): add rejection sampling for non-overlapping layout
fix(riso): resolve rocket R1 RTL direction via offset-path
test(map): verify empty-sel snap creates combination with dragged piece as primary
```

## PR rules

- Always target `develop` (not `main`) for feature/fix branches
- PR title must match Conventional Commits format
- Fill in `.github/pull_request_template.md` before requesting review
- Pass `npx tsc --noEmit` and (if map logic changed) `npx tsx tests/mapLogicTest.ts`
<!-- END:git-workflow-rules -->
