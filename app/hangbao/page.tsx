import { HangbaoHome } from '@/components/themes/hangbao/HangbaoHome'
import { MobileRedirect } from '@/components/MobileRedirect'

export default function HangbaoPage() {
  return (
    <>
      <MobileRedirect to="/formal" />
      <HangbaoHome />
    </>
  )
}
