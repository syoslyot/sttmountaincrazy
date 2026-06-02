# Membership System

## 會員等級

| Role value | 中文名稱 | 說明 |
| --- | --- | --- |
| `staff` | 資料組管理員 | 可存取所有內容，負責資料維護 |
| `member` | 山協隊員 | 通過山協隊員考試的社員 |
| `newcomer` | 山協新生 | 尚未通過隊員考試的社員 |
| `partner` | 校外夥伴 | 非成大山協社員的外部合作者 |

權限層級（高 → 低）：`staff` > `member` > `newcomer` > `partner`。

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
| `MemberRole` | `'staff' \| 'member' \| 'newcomer' \| 'partner'` |
| `UserProfile` | `{ id, user_id, role, display_name, created_at }` |
| `ROLE_LABELS` | MemberRole → 中文名稱對照表 |
| `hasRole(userRole, minRole)` | 回傳 `true` 若 userRole 達到或超過 minRole 的層級 |

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
      {hasRole(role, 'member') && <AdminSection />}
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

## 未來的可見性控制

當需要「某些角色看不到某個區塊」時，統一使用 `hasRole` 做判斷：

```tsx
// 只有 staff 可見
if (!hasRole(role, 'staff')) return null

// member 以上可見（含 staff）
if (!hasRole(role, 'member')) return null
```

如果需要**精確**比對單一角色（非層級），直接比對 `role === 'staff'`。

## 環境變數

| Variable | 說明 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL（browser 可見） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key（browser 可見） |

這兩個值和現有的 `SUPABASE_URL`、`SUPABASE_ANON_KEY` 相同，只是多了 `NEXT_PUBLIC_` 前綴，讓 Next.js 暴露給 browser bundle。
