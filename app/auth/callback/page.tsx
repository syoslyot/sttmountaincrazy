'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthClient } from '@/lib/auth'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) { router.replace('/login?error=missing_code'); return }

    getAuthClient().auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) { router.replace('/login?error=auth_failed'); return }
      router.replace('/formal')
    })
  }, [router])

  return null
}
