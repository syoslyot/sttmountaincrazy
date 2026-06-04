import { SetTheme } from '@/components/SetTheme'
import { FormalLoginClient } from '@/components/themes/formal/FormalLoginClient'

export const metadata = { title: '登入 · 成大山協' }

export default function LoginPage() {
  return (
    <>
      <SetTheme theme="formal" />
      <FormalLoginClient />
    </>
  )
}
