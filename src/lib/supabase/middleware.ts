import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedRoutes = ['/gear', '/profile', '/training']
  const isProtected = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Onboarding redirect logic for authenticated users
  if (user) {
    const pathname = request.nextUrl.pathname

    // Skip onboarding check for paths that should always be accessible
    const skipOnboardingCheck =
      pathname === '/' ||
      pathname === '/onboard' ||
      pathname === '/login' ||
      pathname === '/register' ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/')

    if (!skipOnboardingCheck) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded')
        .eq('id', user.id)
        .single()

      // Module pages that require onboarding
      const moduleRoutes = ['/mountains', '/gear', '/knowledge', '/knots', '/training', '/trips']
      const isModuleRoute = moduleRoutes.some(route => pathname.startsWith(route))

      if (isModuleRoute && (!profile || !profile.onboarded)) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboard'
        return NextResponse.redirect(url)
      }
    }

    // If user is onboarded and visits /onboard without ?view=true, redirect to home
    if (pathname === '/onboard' && !request.nextUrl.searchParams.has('view')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded')
        .eq('id', user.id)
        .single()

      if (profile?.onboarded === true) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
