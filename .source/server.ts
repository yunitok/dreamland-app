// @ts-nocheck
import * as __fd_glob_10 from "../docs/modules/sherlock/schema/prisma-schema.md?collection=sherlock"
import * as __fd_glob_9 from "../docs/modules/sherlock/schema/entity-relationships.md?collection=sherlock"
import * as __fd_glob_8 from "../docs/modules/sherlock/schema/design-decisions.md?collection=sherlock"
import * as __fd_glob_7 from "../docs/modules/sherlock/roadmap/implementation-phases.md?collection=sherlock"
import * as __fd_glob_6 from "../docs/modules/sherlock/integrations/yurest.md?collection=sherlock"
import * as __fd_glob_5 from "../docs/modules/sherlock/integrations/gstock.md?collection=sherlock"
import * as __fd_glob_4 from "../docs/modules/sherlock/analysis/yurest.md?collection=sherlock"
import * as __fd_glob_3 from "../docs/modules/sherlock/analysis/gstock.md?collection=sherlock"
import * as __fd_glob_2 from "../docs/modules/sherlock/analysis/comparison.md?collection=sherlock"
import * as __fd_glob_1 from "../docs/modules/sherlock/README.md?collection=sherlock"
import * as __fd_glob_0 from "../docs/modules/sherlock/index.md?collection=sherlock"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const sherlock = await create.docs("sherlock", "docs/modules/sherlock", {}, {"index.md": __fd_glob_0, "README.md": __fd_glob_1, "analysis/comparison.md": __fd_glob_2, "analysis/gstock.md": __fd_glob_3, "analysis/yurest.md": __fd_glob_4, "integrations/gstock.md": __fd_glob_5, "integrations/yurest.md": __fd_glob_6, "roadmap/implementation-phases.md": __fd_glob_7, "schema/design-decisions.md": __fd_glob_8, "schema/entity-relationships.md": __fd_glob_9, "schema/prisma-schema.md": __fd_glob_10, });