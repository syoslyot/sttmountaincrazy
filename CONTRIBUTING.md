# Contributing to sttmountaincrazy

成大山協瘋狂小甜甜直企展示系統的貢獻指南。無論是修 bug、新增功能，或是接手維護，
請在開始之前閱讀本文件。

---

## 環境設定

**需求**

- Node.js 24+
- npm

**步驟**

1. Clone repo

   ```bash
   git clone https://github.com/syoslyot/sttmountaincrazy.git
   cd sttmountaincrazy
   ```

2. 安裝套件

   ```bash
   npm install
   ```

3. 建立 `.env.local`（**不可 commit 此檔案**）

   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

   > `SUPABASE_SERVICE_KEY` 用於伺服器端繞過 RLS，缺少此值會導致詳細頁 404。
   > 向目前維護者索取。

4. 啟動開發伺服器

   ```bash
   npm run dev
   ```

   開啟 [http://localhost:3000](http://localhost:3000)。

---

## 開發流程（Git Flow）

**分支規則**

| 分支類型 | 命名格式 | 從哪開 | 合併至 |
|---------|---------|-------|-------|
| 新功能 | `feature/<scope>-<desc>` | `develop` | `develop` |
| 修 bug | `fix/<scope>-<desc>` | `develop` | `develop` |
| 緊急修正 | `hotfix/<desc>` | `main` | `main` + `develop` |

`main` 和 `develop` 均受 branch ruleset 保護，**不可直接 push**，必須走 PR。

**開分支範例**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/map-search-filter
```

---

## Commit 格式（Conventional Commits）

```
<type>(<scope>): <subject>   ← 最長 72 字元
```

| type | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修 bug |
| `refactor` | 重構（不影響行為） |
| `chore` | 設定、依賴更新 |
| `docs` | 文件 |
| `test` | 測試 |

**範例**

```
feat(map): add search filter by leader and date
fix(detail): resolve 404 when RLS blocks anon key
chore: add MIT license
```

---

## 開 PR 前的檢查清單

```bash
npx tsc --noEmit   # 型別檢查，0 error 才能送出
npm run lint       # ESLint，0 warning 才能送出
```

- PR 標題需符合 Conventional Commits 格式
- 填寫 PR template（`.github/pull_request_template.md`）
- 目標分支選 `develop`，不是 `main`

---

## 禁止事項

- 不可將 `.env.local` 或任何含金鑰的檔案 commit 進 repo
- 不可直接 push 到 `main` 或 `develop`
- 不可跳過 CI 驗證（`--no-verify`）

---

## 需要幫助？

有問題請開 [Issue](https://github.com/syoslyot/sttmountaincrazy/issues)，
或聯繫目前維護者。
