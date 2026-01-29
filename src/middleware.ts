import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from './lib/session';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Check if the path is /login, /login/, or /locale/login
  const isLoginPage = pathname === '/login' || pathname === '/login/' || routing.locales.some(
    (locale) => pathname === `/${locale}/login` || pathname === `/${locale}/login/`
  );

  // 2. Get the session
  const session = request.cookies.get("session")?.value;
  let user = null;
  if (session) {
    try {
      user = await decrypt(session);
    } catch (e) {
      // Session might be expired or invalid
    }
  }

  // 3. Auth Logic
  if (!user && !isLoginPage) {
    // Not logged in and not on login page -> Redirect to /login
    // Determine the locale from the pathname or fallback
    const locale = routing.locales.find((l) => pathname.startsWith(`/${l}`)) || routing.defaultLocale;
    
    // Construct the login URL. If it's the default locale and prefix is as-needed, 
    // next-intl expects /login (not /es/login)
    const loginPath = locale === routing.defaultLocale && routing.localePrefix === 'as-needed' 
      ? '/login' 
      : `/${locale}/login`;
      
    const loginUrl = new URL(loginPath, request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginPage) {
    // Logged in and on login page -> Redirect to dashboard
    const locale = routing.locales.find((l) => pathname.startsWith(`/${l}`)) || routing.defaultLocale;
    const dashboardPath = locale === routing.defaultLocale && routing.localePrefix === 'as-needed'
      ? '/'
      : `/${locale}`;
      
    const dashboardUrl = new URL(dashboardPath, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 4. Run intl middleware
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for
  // - API routes
  // - Static files (_next, images, etc.)
  // - Metadata files (favicon.ico, sitemap.xml, robots.txt, etc.)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
