# DB Migration Report — 會員系統

**日期**：2026-06-02  
**目標 repo**：`sttmountain`（Supabase schema owner）  
**影響 repo**：`sttmountaincrazy`（frontend consumer）

---

## 背景

`sttmountaincrazy` 新增會員系統，需要儲存使用者角色。本報告說明 `sttmountain` 側需要執行的 DB 變更。

---

## 需要新增的物件

### 1. Enum 型別

```sql
CREATE TYPE member_role AS ENUM (
  'staff',     -- 資料組管理員
  'member',    -- 山協隊員（通過隊員考試）
  'newcomer',  -- 山協新生
  'partner'    -- 校外夥伴
);
```

### 2. `user_profiles` 資料表

```sql
CREATE TABLE user_profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role         member_role NOT NULL,
  display_name text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

---

## Row Level Security (RLS)

### 啟用 RLS

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

### 政策設計

| 政策名稱 | 操作 | 說明 |
| --- | --- | --- |
| `profiles_select_own` | SELECT | 已登入使用者只能讀自己的 profile |
| `profiles_select_staff` | SELECT | staff 可讀所有 profile |
| `profiles_insert_staff` | INSERT | 只有 staff 可新增（或透過後台） |
| `profiles_update_staff` | UPDATE | 只有 staff 可修改角色 |

```sql
-- 讀自己
CREATE POLICY profiles_select_own ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- staff 讀全部
CREATE POLICY profiles_select_staff ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'staff'
    )
  );

-- staff 新增
CREATE POLICY profiles_insert_staff ON user_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'staff'
    )
  );

-- staff 修改
CREATE POLICY profiles_update_staff ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'staff'
    )
  );
```

> 第一個 staff 帳號需透過 service role key 或直接在 Supabase Dashboard 手動插入，
> 因為初始狀態下不存在任何 staff。

---

## 環境變數（sttmountaincrazy 側）

`sttmountaincrazy` 的 `.env.local` 需新增兩個 browser-exposed 變數：

```env
NEXT_PUBLIC_SUPABASE_URL=<同 SUPABASE_URL 的值>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<同 SUPABASE_ANON_KEY 的值>
```

這兩個值與現有的 `SUPABASE_URL`、`SUPABASE_ANON_KEY` 相同，
只是多了 `NEXT_PUBLIC_` 前綴讓 Next.js 暴露給 browser bundle。

---

## Migration 檔案位置

SQL 已寫入 `sttmountain/db/migrations/0005_membership.sql`，請直接使用該檔案。
詳細說明見 `sttmountain/docs/membership.md`。

## 執行順序

1. 在 dev Supabase 執行 `sttmountain/db/migrations/0005_membership.sql`
2. 在 Supabase Dashboard 手動插入第一個 staff profile
3. 通知 `sttmountaincrazy` 端在 `.env.local` 補上 `NEXT_PUBLIC_*` 變數
4. 驗證 dev 環境登入與角色讀取正常
5. 在 prod Supabase 重複步驟 1–2

---

## 不影響的現有物件

| 表 / RPC | 是否受影響 |
| --- | --- |
| `expeditions` | 不影響 |
| `gpx_files` | 不影響 |
| `map_files` | 不影響 |
| `records` | 不影響 |
| `expedition_counties` | 不影響 |
| `list_expeditions` RPC | 不影響 |
| `get_expedition_years` RPC | 不影響 |

> 遠征資料中的「leader」（領隊）、「guide」（嚮導）欄位是遠征紀錄的字串欄位，
> 與 `user_profiles.role` 無關，不需修改。
