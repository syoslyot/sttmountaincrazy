# Git Flow

This project uses protected `main` and `develop` branches.

## Branches

| Branch | Meaning |
| --- | --- |
| `main` | Production release branch |
| `develop` | Integration branch for completed work |
| `feature/*` | New user-facing behavior |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation changes |
| `release/*` | Versioned release branch |
| `hotfix/*` | Urgent production fix |

## Normal Feature Flow

```text
develop -> feature/<scope>-<desc> -> PR to develop
```

After the PR is merged, pull `develop`. Do not merge it locally unless instructed.

## Release Flow

```text
develop -> release/<version>
release/<version> -> PR to main
release/<version> -> PR to develop
```

The release branch may include a version bump and release-only cleanup. Open both PRs, but do not merge them yourself.

## Hotfix Flow

```text
main -> hotfix/<desc>
hotfix/<desc> -> PR to main
hotfix/<desc> -> PR to develop
```

Use hotfix only for urgent production problems. Non-urgent bugs should go through `fix/*` into `develop`.

## Local Pull Rule

Only pull a branch after its PR has been merged. Pull should be fast-forward only when possible:

```bash
git switch develop
git pull --ff-only
```
