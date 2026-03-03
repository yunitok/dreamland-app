// Re-exportar el handler existente — la lógica de parse es independiente del dominio
export { POST } from "@/app/api/atc/knowledge-base/parse-file/route"
export const runtime = "nodejs"
