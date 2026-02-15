// source.config.ts
import { defineDocs, defineConfig } from "fumadocs-mdx/config";
var sherlock = defineDocs({
  dir: "docs/modules/sherlock"
});
var source_config_default = defineConfig({
  mdxOptions: {
    remarkPlugins: [],
    rehypePlugins: []
  }
});
export {
  source_config_default as default,
  sherlock
};
