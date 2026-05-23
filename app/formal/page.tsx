import { SetTheme } from '@/components/SetTheme'
import { FormalHome } from '@/components/themes/formal/FormalHome'

export default function FormalPage() {
  return (
    <>
      <SetTheme theme="formal" />
      <FormalHome />
    </>
  )
}
