import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/chat'

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get() {
            return null
          },
          set() {
          },
          remove() {
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      const response = NextResponse.redirect(`${origin}${next}`)
      
      response.cookies.set({
        name: 'sb-access-token',
        value: data.session.access_token,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: data.session.expires_in,
      })
      
      if (data.session.refresh_token) {
        response.cookies.set({
          name: 'sb-refresh-token',
          value: data.session.refresh_token,
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
      }

      return response
    }
  }

  return NextResponse.redirect(`${origin}/`)
}
