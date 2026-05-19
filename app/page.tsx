'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  useEffect(() => {
    router.replace(Math.random() < 0.5 ? '/rocket' : '/hangbao')
  }, [router])
  return null
}
