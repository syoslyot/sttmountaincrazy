# Contributing to sttmountaincrazy

這份文件是前端 repo 的協作入口。功能、修 bug、文件整理與 release 都需要遵守同一套 Git flow。

## Environment

需求：

- Node.js 24+
- npm

安裝與啟動：

```bash
npm install
npm run dev
```

建立 `.env.local`：

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

若詳細頁需要 server-side 權限，向維護者索取 server-only 設定；不要把 service role key 放進瀏覽器端程式碼。

## Workflow

`main` 和 `develop` 都受 GitHub branch ruleset 保護，不可直接 push。

| 任務 | 分支 | 來源 | PR 目標 |
| --- | --- | --- | --- |
| 新功能 | `feature/<scope>-<desc>` | `develop` | `develop` |
| 修 bug | `fix/<scope>-<desc>` | `develop` | `develop` |
| 文件 | `docs/<desc>` | `develop` | `develop` |
| release | `release/<version>` | `develop` | `main` and `develop` |
| hotfix | `hotfix/<desc>` | `main` | `main` and `develop` |

Release PR 不要自行 merge。開 PR 後等 reviewer 或 maintainer 合併；合併後才 pull。

## Commit Format

使用 Conventional Commits：

```text
<type>(<scope>): <subject>
```

常用 type：

| type | 用途 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 修 bug |
| `docs` | 文件 |
| `refactor` | 不改行為的重構 |
| `test` | 測試 |
| `chore` | 依賴、設定、版本 |

範例：

```text
feat(formal): add mobile map layer switcher
fix(detail): keep mobile header fixed while dragging map
docs: reorganize project documentation
```

## Before Opening a PR

```bash
npx tsc --noEmit
npm run lint
```

檢查清單：

- PR 目標分支正確。
- PR title 使用 Conventional Commits。
- UI 變更附上截圖或說明測試裝置。
- 依賴 DB 變更時，PR body 明確寫出對應 `sttmountain` migration/PR。
- 不 commit `.env.local`、金鑰、暫存檔或 build output。

## Coding Style

細節放在 [docs/coding-style.md](docs/coding-style.md)。簡短原則：

- 優先沿用既有元件與資料流。
- TypeScript 型別要描述資料 contract，不用 `any` 逃避錯誤。
- UI 風格依各 theme 文件維護，不跨 theme 任意共用樣式。
- 需要 DB contract 時，先改 `sttmountain`，再改 frontend。

## Documentation

README 只放入口資訊。長文件請放到 `docs/`，新增文件時也更新 README 的文件索引。
