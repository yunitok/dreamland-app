import { docs } from '@/source';
import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';
import { setRequestLocale } from 'next-intl/server';

interface PageProps {
  params: Promise<{ 
    locale: string;
    slug?: string[];
  }>;
}

export default async function Page({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  
  const page = docs.getPage(slug);

  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage 
      toc={page.data.toc} 
      full={page.data.full}
      tableOfContent={{ style: 'clerk' }}
    >
      <DocsBody>
        <h1>{page.data.title as string}</h1>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const params: { locale: string; slug?: string[] }[] = [];
  
  for (const locale of routing.locales) {
    // Add root page for each locale
    params.push({ locale, slug: undefined });
    
    // Add all pages for each locale
    for (const page of docs.getPages()) {
      params.push({ locale, slug: page.slugs });
    }
  }
  
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = docs.getPage(slug);

  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
