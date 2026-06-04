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

目前 `0017` 的 RPC 只過濾掉有 `approved` leader 的隊伍，有 `pending` 申請的隊伍仍會出現在清單中（允許多人同時申請）。如需改成「有 pending 就消失」可另開 migration 調整 where 條件。
