# Troubleshooting

## Year Filter Only Shows ALL

Likely causes:

- `get_expedition_years()` is missing in the target Supabase DB.
- The migration was applied to dev but not prod.
- The frontend is pointed at the wrong Supabase project.

Check the DB repo migration first, then ask the DB admin to run the SQL in Supabase.

## Detail Page 404

Check:

- expedition id exists in Supabase;
- related rows are readable through the expected query;
- required server-side env vars are present;
- RLS policies or RPC grants did not change.

## Map Is Blank

Check browser console for:

- missing GPX/KML file;
- failed Storage redirect;
- MapLibre or Leaflet asset errors;
- container height collapsing on mobile.

## 編輯頁面進去就被導回詳細頁

`FormalEditClient` 有 auth guard：載入後如果目前使用者不是 approved leader、`can_edit` 成員，或 staff，會立即 redirect 到詳細頁。

確認：
- 使用者是否已登入（`useAuth().user` 非 null）
- `expedition_members` 是否有該使用者的 approved 紀錄（`status='approved'` 且 `role='leader'` 或 `can_edit=true`）
- 若是 staff，確認 `user_profiles.role = 'staff'`

## 認領後 pending claims 沒出現在 Staff 審核區

- 確認帳號的 `user_profiles.role = 'staff'`（由資料組管理員在 Supabase Dashboard 設定）
- `listPendingClaims()` 在 `role !== 'staff'` 時不會呼叫；RPC `list_pending_claims()` 也會對非 staff 回傳空陣列

## GitHub Actions Does Not Start

Confirm GitHub Actions status first. If GitHub is healthy, push a new commit to the PR branch or rerun the failed workflow from the Actions page.

## GitHub Actions Checkout 403

If logs show `Your account is suspended`, the runner cannot fetch the repo. This is not a code failure. Resolve the GitHub account or repository access issue, then rerun the workflow.
