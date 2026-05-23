import { SetTheme } from '@/components/SetTheme'
import { FormalComingSoon } from '@/components/themes/formal/FormalComingSoon'

export default function FormalSubmitPage() {
  return (
    <>
      <SetTheme theme="formal" />
      <FormalComingSoon title="投稿" subtitle="SUBMIT · 上傳出隊紀錄" activeHref="/formal/submit" />
    </>
  )
}
