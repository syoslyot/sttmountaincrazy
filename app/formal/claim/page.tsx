import { SetTheme } from '@/components/SetTheme'
import { FormalClaimClient } from '@/components/themes/formal/FormalClaimClient'

export const metadata = { title: '認領隊伍 · 成大山協' }

export default function ClaimPage() {
  return (
    <>
      <SetTheme theme="formal" />
      <FormalClaimClient />
    </>
  )
}
