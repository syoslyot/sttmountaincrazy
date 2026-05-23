'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function MobileRedirect({ to }: { to: string }) {
  const router = useRouter()
  useEffect(() => {
    if (window.matchMedia('(max-width: 680px)').matches) {
      router.replace(to)
    }
  }, [router, to])
  return null
}
