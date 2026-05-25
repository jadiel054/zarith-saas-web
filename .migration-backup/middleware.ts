import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Proteção de rotas autenticadas
  const protectedRoutes = ['/chat', '/settings', '/memories', '/dashboard', '/admin']
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Trava extra para /admin
  if (path.startsWith('/admin')) {
    const isAdmin = user && (user.email === 'jadiel054@gmail.com' || user.user_metadata?.user_name === 'jadiel054')
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/chat', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/chat/:path*', '/settings/:path*', '/memories/:path*', '/dashboard/:path*', '/admin/:path*'],
}
