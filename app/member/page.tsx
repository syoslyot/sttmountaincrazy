import { SetTheme } from '@/components/SetTheme'
import { FormalMemberClient } from '@/components/themes/formal/FormalMemberClient'

export const metadata = { title: '會員 · 成大山協' }

export default function MemberPage() {
  return (
    <>
      <SetTheme theme="formal" />
      <FormalMemberClient />
    </>
  )
}
