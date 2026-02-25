import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from '@/i18n/routing'
import { decrypt } from '@/lib/session'

// Rutas accesibles sin sesión (sin prefijo de locale)
const PUBLIC_PATHS = ['/login']

const handleI18n = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Eliminar el prefijo de locale para obtener la ruta real
  const localePattern = new RegExp(`^/(${routing.locales.join('|')})`)
  const pathnameWithoutLocale = pathname.replace(localePattern, '') || '/'
  const localeMatch = pathname.match(localePattern)
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale

  // Verificar si es una ruta pública
  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathnameWithoutLocale === p || pathnameWithoutLocale.startsWith(`${p}/`)
  )

  if (!isPublicPath) {
    const sessionCookie = request.cookies.get('session')?.value
    let isValid = false

    if (sessionCookie) {
      try {
        await decrypt(sessionCookie)
        isValid = true
      } catch {
        isValid = false
      }
    }

    if (!isValid) {
      const loginUrl = new URL(`/${locale}/login`, request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return handleI18n(request)
}

export const config = {
  // Excluir archivos estáticos, imágenes, y rutas de API
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.[^/]*$).*)'],
}
