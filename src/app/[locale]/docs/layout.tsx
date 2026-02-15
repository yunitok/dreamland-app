import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { docs } from '@/source';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { setRequestLocale } from 'next-intl/server';
import 'fumadocs-ui/style.css';

export default async function Layout({ 
  children, 
  params 
}: { 
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <RootProvider>
      <DocsLayout
        tree={docs.pageTree}
        nav={{
          title: '📚 Dreamland Documentation',
          url: `/${locale}/docs`,
        }}
        sidebar={{
          defaultOpenLevel: 1,
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
