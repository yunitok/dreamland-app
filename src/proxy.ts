
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from './lib/session';

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Quick fix: redirect /docs to /es/docs ONLY if no locale prefix exists
  // With localePrefix: 'always', this is now safe and won't cause loops
  const hasLocalePrefix = routing.locales.some(locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`);
  
  if (!hasLocalePrefix && (pathname === '/docs' || pathname.startsWith('/docs/'))) {
    return NextResponse.redirect(new URL(`/es${pathname}`, request.url));
  }
  
  // Public paths that don't require authentication
  const publicPaths = ['/login', '/change-password'];
  
  // Check if current path is public (with or without locale prefix)
  const isPublicPath = publicPaths.some(path => {
    // Check without locale (shouldn't happen with 'always' but good safety)
    if (pathname === path || pathname === `${path}/`) return true;
    
    // Check with locale prefix
    return routing.locales.some(locale => 
      pathname === `/${locale}${path}` || pathname === `/${locale}${path}/`
    );
  });
  
  // Get session
  const session = request.cookies.get("session")?.value;
  let user: any = null;
  if (session) {
    try {
      user = await decrypt(session);
    } catch {
      // Session invalid
    }
  }
  
  // Determine locale from pathname
  const pathnameLocale = routing.locales.find(locale =>
    pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  const locale = pathnameLocale || routing.defaultLocale;
  
  // Auth redirects BEFORE intl middleware
  if (!user && !isPublicPath) {
    // Not logged in -> redirect to login
    // With 'always' strategy, we always use the prefixed path
    const loginPath = `/${locale}/login`;
    return NextResponse.redirect(new URL(loginPath, request.url));
  }
  
  if (user) {
    const isLoginPage = publicPaths[0] === '/login' && (
      pathname === '/login' || 
      pathname === '/login/' ||
      pathname === `/${locale}/login` ||
      pathname === `/${locale}/login/`
    );
    
    const isChangePasswordPage = publicPaths[1] === '/change-password' && (
      pathname === '/change-password' ||
      pathname === '/change-password/' ||
      pathname === `/${locale}/change-password` ||
      pathname === `/${locale}/change-password/`
    );
    
    // Force password change
    if (user.user?.mustChangePassword && !isChangePasswordPage) {
      const changePasswordPath = `/${locale}/change-password`;
      return NextResponse.redirect(new URL(changePasswordPath, request.url));
    }
    
    // Redirect from login if already logged in
    if (isLoginPage) {
      const dashboardPath = `/${locale}`;
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }
  
  // Run intl middleware for locale handling
  const intlMiddleware = createMiddleware(routing);
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
