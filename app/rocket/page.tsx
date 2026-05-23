import { RocketHome } from '@/components/themes/rocket/RocketHome'
import { SetTheme } from '@/components/SetTheme'
import { MobileRedirect } from '@/components/MobileRedirect'

export default function RocketPage() {
  return (
    <>
      <MobileRedirect to="/formal" />
      <SetTheme theme="rocket" />
      <RocketHome />
    </>
  )
}
