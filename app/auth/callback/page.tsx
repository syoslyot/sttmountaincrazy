'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthClient } from '@/lib/auth'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) { router.replace('/formal'); return }

    getAuthClient().auth.exchangeCodeForSession(code).then(() => {
      router.replace('/formal')
    })
  }, [router])

  return null
}
