import { loader } from 'fumadocs-core/source';
import { sherlock as sherlockSource } from '../.source/server';

export const sherlock = loader({
  baseUrl: '/docs',
  source: sherlockSource.toFumadocsSource(),
});
