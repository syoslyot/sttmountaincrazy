import { NextRequest, NextResponse } from 'next/server'

function isMobileUA(ua: string | null) {
  return !!ua && /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua)
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!isMobileUA(req.headers.get('user-agent'))) return NextResponse.next()

  if (pathname === '/rocket' || pathname.startsWith('/rocket/')) {
    return NextResponse.redirect(new URL('/formal', req.url))
  }

  if (pathname === '/hangbao' || pathname.startsWith('/hangbao/')) {
    return NextResponse.redirect(new URL('/formal', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/rocket', '/rocket/:path*', '/hangbao', '/hangbao/:path*'],
}
