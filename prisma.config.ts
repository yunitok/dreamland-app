import "dotenv/config";
import { defineConfig } from "prisma/config";


export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI commands (migrate, studio) must use the direct connection
    url: process.env["DIRECT_URL"],
  },
});
