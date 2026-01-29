import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - API routes
  // - Static files (_next, images, etc.)
  // - Metadata files (favicon.ico, sitemap.xml, robots.txt, etc.)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
