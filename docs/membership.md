# Membership System

## 會員等級

| Role value | 中文名稱 | 說明 |
| --- | --- | --- |
| `curator` | 資料組管理員 | 可存取所有內容，負責資料維護 |
| `ranger` | 山協隊員 | 通過山協隊員考試的社員 |
| `cadet` | 山協新生 | 尚未通過隊員考試的社員 |
| `associate` | 校外夥伴 | 非成大山協社員的外部合作者 |

權限層級（高 → 低）：`curator` > `ranger` > `cadet` > `associate`。

> 隊伍資料中的「領隊」、「嚮導」是遠征紀錄的欄位，與此會員等級無關。

## 資料來源

角色儲存於 Supabase `user_profiles` 表，欄位 `role`（enum）。詳見 [database-contract.md](database-contract.md) 與 [db-migration-report-membership.md](db-migration-report-membership.md)。

## Auth Client

`lib/auth.ts` 提供一個 singleton browser-side Supabase client，**僅**用於 auth 操作（登入/登出/監聽 session）。資料查詢（expeditions 等）繼續使用 `lib/supabase.ts` 的 server-side client。

## 型別 / Helper

```ts
import { type MemberRole, type UserProfile, hasRole, ROLE_LABELS } from '@/lib/auth'
```

| Symbol | 說明 |
| --- | --- |
| `MemberRole` | `'curator' \| 'ranger' \| 'cadet' \| 'associate'` |
| `UserProfile` | `{ id, user_id, role, name, nickname, contact, avatar_url, joined_at, created_at }` |
| `ROLE_LABELS` | MemberRole → 中文名稱對照表 |
| `hasRole(userRole, minRole)` | 回傳 `true` 若 userRole 達到或超過 minRole 的層級 |
| `listMyMemberships()` | 取得目前登入者所有 `expedition_members` 紀錄（含 expedition info） |
| `submitClaim(expeditionId, evidence)` | 對指定隊伍提出領隊認領申請 |
| `listPendingClaims()` | 取得所有待審核的認領申請（curator only） |
| `reviewClaim(claimId, action)` | 審核認領申請，`action`: `'approved'` \| `'rejected'`（curator only） |
| `updateExpedition(id, fields)` | 更新隊伍資料，自動設 `sync_locked = true`（approved leader 或 curator） |
| `getExpeditionMembers(expeditionId)` | 取得隊伍所有 approved 成員（含 user_id、role、expedition_role、can_edit） |
| `syncExpeditionMembers(expeditionId, members)` | 取代所有非領隊成員（approved leader 或 curator） |
| `saveExpeditionJournal(expeditionId, blocks)` | 儲存圖文紀錄 blocks（approved leader、can_edit 成員，或 curator） |
| `listMemberProfiles()` | 取得全員名單供成員選擇器使用（approved leader 或 curator 才會回傳資料） |

## 在 Component 中取得目前使用者

```tsx
'use client'
import { useAuth } from '@/components/AuthProvider'
import { hasRole } from '@/lib/auth'

export function SomeComponent() {
  const { user, role, loading } = useAuth()

  if (loading) return null
  if (!user) return <p>請先登入</p>

  return (
    <>
      <p>歡迎，{role}</p>
      {hasRole(role, 'ranger') && <AdminSection />}
    </>
  )
}
```

## 登入 / 登出

```tsx
const { signIn, signOut } = useAuth()

// 登入
const { error } = await signIn(email, password)

// 登出
await signOut()
```

## MyMembership 型別

```ts
import { type MyMembership, listMyMemberships } from '@/lib/auth'

// 取得目前使用者的所有出隊紀錄
const { data: memberships } = await listMyMemberships()

// 每筆 membership
// { id, role: 'leader'|'member', status: 'pending'|'approved'|'rejected',
//   expedition: { id, name, date_start, grade } | null }
```

## 我參與的隊伍排序

`FormalMemberClient` 取得 memberships 後，client-side 依以下規則排序：

1. **狀態優先**：`pending`（待審核）→ `rejected`（已拒絕）→ `approved`（已通過）
2. **同狀態內**：出隊日期 `date_start` 新 → 舊

目的是讓需要注意的申請（待審核、已拒絕）優先顯示在上方，已通過的記錄則依時間降序排列。

## 未來的可見性控制

當需要「某些角色看不到某個區塊」時，統一使用 `hasRole` 做判斷：

```tsx
// 只有 curator 可見
if (!hasRole(role, 'curator')) return null

// ranger 以上可見（含 curator）
if (!hasRole(role, 'ranger')) return null
```

如果需要**精確**比對單一角色（非層級），直接比對 `role === 'curator'`。

## 環境變數

| Variable | 說明 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL（browser 可見） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key（browser 可見） |

這兩個值和現有的 `SUPABASE_URL`、`SUPABASE_ANON_KEY` 相同，只是多了 `NEXT_PUBLIC_` 前綴，讓 Next.js 暴露給 browser bundle。已補充至 `.env.local`；Render 部署時需同步新增這兩個環境變數。
