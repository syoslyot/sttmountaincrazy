# Deployment

The frontend is deployed from `main`. Pull requests to `main` must pass GitHub Actions before merge.

## Render

Production URL: https://sttmountain.onrender.com

Required environment variables:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | public anon key for read access |

Do not configure `SUPABASE_SERVICE_KEY` for browser-side use. If server-only code needs elevated access, keep it scoped to server execution and document why.

## GitHub Actions

PRs targeting `main` run:

```bash
npm ci
npx tsc --noEmit
npm run lint
```

After merge to `main`, the workflow builds and pushes the Docker image, then triggers Render deploy when the deploy hook secret is configured.

## Release Dependency on DB

Frontend releases that depend on a new RPC or column must wait until the DB migration has been applied manually:

1. Run migration in dev Supabase.
2. Verify the frontend against dev.
3. Run migration in prod Supabase.
4. Merge or deploy frontend release.

This ordering prevents production frontend code from calling a missing RPC.
