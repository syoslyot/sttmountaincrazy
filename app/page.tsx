import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const roll = Math.random()
  const target = roll < 0.98 ? '/formal' : roll < 0.99 ? '/rocket' : '/hangbao'
  redirect(target)
}
