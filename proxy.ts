import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: req,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            req.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request: req,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const isDashboardRoute = req.nextUrl.pathname.startsWith('/dashboard')
  const isAuthRoute = req.nextUrl.pathname === '/signin' || req.nextUrl.pathname === '/signup'
  const isApiDeviceRoute = req.nextUrl.pathname.startsWith('/api/devices')
  const isApiCronRoute = req.nextUrl.pathname.startsWith('/api/cron')
  const isHomeRoute = req.nextUrl.pathname === '/'

  // Allow home page, device API, and cron jobs
  if (isHomeRoute || isApiDeviceRoute || isApiCronRoute) {
    return supabaseResponse
  }

  // Redirect to signin if accessing dashboard without session
  if (isDashboardRoute && !session) {
    const redirectUrl = new URL('/signin', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if accessing auth routes with session
  if (isAuthRoute && session) {
    const redirectUrl = new URL('/dashboard', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/signin',
    '/signup',
    '/api/devices/:path*',
    '/api/cron/:path*',
  ],
}
