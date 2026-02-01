import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['es', 'en', 'de', 'fr', 'it', 'ru'],

  // Used when no locale matches (Spanish as default)
  defaultLocale: 'es',

  // Don't prefix the default locale (optional, cleaner URLs)
  localePrefix: 'as-needed'
});

export type Locale = (typeof routing.locales)[number];
