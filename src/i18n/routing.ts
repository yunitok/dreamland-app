import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['es', 'en', 'de', 'fr', 'it', 'ru'],

  // Used when no locale matches (Spanish as default)
  defaultLocale: 'es',

  // Always prefix the default locale (avoids redirect loops with /docs)
  localePrefix: 'always'
});

export type Locale = (typeof routing.locales)[number];
