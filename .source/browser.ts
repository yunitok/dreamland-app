// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  sherlock: create.doc("sherlock", {"index.md": () => import("../docs/modules/sherlock/index.md?collection=sherlock"), "README.md": () => import("../docs/modules/sherlock/README.md?collection=sherlock"), "analysis/comparison.md": () => import("../docs/modules/sherlock/analysis/comparison.md?collection=sherlock"), "analysis/gstock.md": () => import("../docs/modules/sherlock/analysis/gstock.md?collection=sherlock"), "analysis/yurest.md": () => import("../docs/modules/sherlock/analysis/yurest.md?collection=sherlock"), "integrations/gstock.md": () => import("../docs/modules/sherlock/integrations/gstock.md?collection=sherlock"), "integrations/yurest.md": () => import("../docs/modules/sherlock/integrations/yurest.md?collection=sherlock"), "roadmap/implementation-phases.md": () => import("../docs/modules/sherlock/roadmap/implementation-phases.md?collection=sherlock"), "schema/design-decisions.md": () => import("../docs/modules/sherlock/schema/design-decisions.md?collection=sherlock"), "schema/entity-relationships.md": () => import("../docs/modules/sherlock/schema/entity-relationships.md?collection=sherlock"), "schema/prisma-schema.md": () => import("../docs/modules/sherlock/schema/prisma-schema.md?collection=sherlock"), }),
};
export default browserCollections;