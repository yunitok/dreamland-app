import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

export const sherlock = defineDocs({
  dir: 'docs/modules/sherlock',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});
