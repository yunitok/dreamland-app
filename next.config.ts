import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { createMDX } from 'fumadocs-mdx/next';

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withMDX = createMDX();

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
  // Paquetes CJS que no deben bundlearse para evitar conflictos ESM/CJS
  serverExternalPackages: ['pdf-parse'],

  // Experimental optimizations
  experimental: {
    // Optimize package imports for smaller bundles
    optimizePackageImports: [
      'date-fns',
    ],
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/:locale/walk-in/:slug*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },

  // Redirects for legacy routes removed - relying on component updates and proxy handling.
  /* async redirects() {
    return [];
  }, */
  
  // Logging for production debugging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
};

export default withMDX(withNextIntl(nextConfig));

