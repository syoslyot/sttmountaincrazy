import { SetTheme } from '@/components/SetTheme'
import { FormalComingSoon } from '@/components/themes/formal/FormalComingSoon'

export default function FormalAboutPage() {
  return (
    <>
      <SetTheme theme="formal" />
      <FormalComingSoon title="關於" subtitle="ABOUT · 關於成大山協" activeHref="/formal/about" />
    </>
  )
}
