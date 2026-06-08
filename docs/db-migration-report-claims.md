# DB Migration Report — 認領系統

**日期**：2026-06-03  
**Migration**：`sttmountain/db/migrations/0018_expedition_claim_rpc.sql`

---

## 背景

`/claim` 頁面讓使用者對尚未有領隊的隊伍提出認領申請，附上佐證後由管理員審核。

認領資料存入已有的 `expedition_members` 表（`role = 'leader'`, `status = 'pending'`），不另建新表。

---

## DB 變更

| 變更 | 說明 |
| --- | --- |
| `expedition_members.evidence text` | 新增欄位，儲存認領佐證說明 |
| `submit_expedition_claim(p_expedition_id, p_evidence)` RPC | `SECURITY DEFINER`，`user_id` 由 `auth.uid()` 注入 |

---

## 前端呼叫方式

```ts
import { submitClaim } from '@/lib/auth'

const { error } = await submitClaim(expeditionId, evidence)
```

`submitClaim` 在 `lib/auth.ts`，透過 browser-side auth client 呼叫 RPC。

---

## 執行順序

1. 在 dev Supabase 執行 `0018_expedition_claim_rpc.sql`
2. 驗證：登入後送出認領，確認 `expedition_members` 寫入一筆 `role='leader', status='pending'`
3. 確認重複送出時 UNIQUE constraint 報錯（前端會顯示錯誤訊息）
4. prod 重複執行

---

## `list_unclaimed_expeditions` 行為

目前 `0017` 的 RPC 只過濾掉有 `approved` leader 的隊伍，有 `pending` 申請的隊伍仍會出現在清單中（`claim_status: 'pending'`，前端顯示為不可點擊）。

---

## Migration 0036 — 唯一性約束

`expedition_members` 加上 `UNIQUE (expedition_id, user_id)`，確保同一使用者對同一隊伍最多一筆紀錄。

---

## Migration 0037 — 拒絕後可重新申請

原本 `submit_expedition_claim` 使用 `INSERT`，被拒絕後再申請會觸發 unique constraint 錯誤。改為 `INSERT ... ON CONFLICT DO UPDATE`：

- `status = 'rejected'` → 重設為 `pending`，允許重新提交
- `status = 'pending'` 或 `'approved'` → 保持不變，不覆蓋

---

## Migration 0038 — INSERT RLS 修正（安全性）

**漏洞**：原本的 INSERT RLS 只驗證 `user_id = auth.uid()`，任何登入使用者可直接 INSERT `role='leader', status='approved'` 到任意隊伍，繞過整個認領審核流程。

**修正**：`WITH CHECK` 限制直接 INSERT 必須為：
- `role = 'leader'`
- `status = 'pending'`
- `can_edit = false`

透過 SECURITY DEFINER RPC（`submit_expedition_claim`、`sync_expedition_members`）的操作不受 RLS 影響，行為不變。

---

## Migration 0039 — NULL uid 防護

`update_expedition`、`review_expedition_claim`、`list_pending_claims`、`submit_expedition_claim` 補上 `IF auth.uid() IS NULL THEN RAISE EXCEPTION` 明確檢查，與 migration 0033 對 `sync_expedition_members`/`save_expedition_journal` 的修正保持一致。
