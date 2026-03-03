import { z } from "zod"

export const knowledgeBaseSchema = z.object({
  title:      z.string().min(3, "El titulo es obligatorio").max(200),
  content:    z.string().min(10, "El contenido es obligatorio").max(3000),
  categoryId: z.string().cuid().optional().or(z.literal("")).transform(v => v || undefined),
  section:    z.string().max(100).optional().or(z.literal("")).transform(v => v || undefined),
  source:     z.string().default("manual"),
  language:   z.string().default("es"),
  active:     z.boolean().default(true),
  domains:    z.array(z.string()).min(1, "Se requiere al menos un dominio").optional(),
})

export type KnowledgeBaseFormValues = z.infer<typeof knowledgeBaseSchema>
