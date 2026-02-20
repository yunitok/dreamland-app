import { z } from "zod"

export const reservationSchema = z.object({
  guestName:      z.string().min(2, "El nombre es obligatorio"),
  guestEmail:     z.string().email("Email inválido").optional().or(z.literal("")),
  guestPhone:     z.string().optional(),
  partySize:      z.number().int().min(1).max(50),
  date:           z.coerce.date(),
  time:           z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  channelId:      z.string().cuid(),
  status:         z.enum(["PENDING", "CONFIRMED", "SEATED", "CANCELLED", "NO_SHOW", "WAITING"]).optional(),
  notes:          z.string().optional(),
  externalId:     z.string().optional(),
  externalSource: z.string().optional(),
})

export const waitingListSchema = z.object({
  guestName:     z.string().min(2, "El nombre es obligatorio"),
  guestPhone:    z.string().min(9, "Teléfono inválido"),
  partySize:     z.number().int().min(1),
  requestedDate: z.coerce.date(),
  priority:      z.number().int().min(0).max(10).default(0),
  notes:         z.string().optional(),
})

export const querySchema = z.object({
  guestInput: z.string().min(5, "La consulta es demasiado corta"),
  categoryId: z.string().cuid(),
  channel:    z.string().default("WEB"),
})

export const incidentSchema = z.object({
  type:        z.enum(["PAYMENT", "WEATHER", "COMPLAINT", "GROUP", "OTHER"]),
  severity:    z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string().min(10, "La descripción es obligatoria"),
  assignedTo:  z.string().optional(),
})

export const invoiceSchema = z.object({
  guestName:     z.string().min(2, "El nombre es obligatorio"),
  guestEmail:    z.string().email("Email inválido").optional().or(z.literal("")),
  items:         z.array(z.object({
    description: z.string().min(1),
    quantity:    z.number().positive(),
    unitPrice:   z.number().nonnegative(),
  })),
  subtotal:      z.number().nonnegative(),
  tax:           z.number().nonnegative(),
  total:         z.number().nonnegative(),
  reservationId: z.string().cuid().optional(),
})

export const giftVoucherSchema = z.object({
  code:        z.string().min(4).max(20),
  value:       z.number().positive("El valor debe ser positivo"),
  purchasedBy: z.string().optional(),
  expiresAt:   z.coerce.date().optional(),
})

export const knowledgeBaseSchema = z.object({
  title:      z.string().min(3, "El título es obligatorio").max(200),
  content:    z.string().min(10, "El contenido es obligatorio").max(3000),
  categoryId: z.string().cuid().optional().or(z.literal("")).transform(v => v || undefined),
  section:    z.string().max(100).optional().or(z.literal("")).transform(v => v || undefined),
  source:     z.string().default("manual"),
  language:   z.string().default("es"),
  active:     z.boolean().default(true),
})

export type ReservationFormValues  = z.infer<typeof reservationSchema>
export type WaitingListFormValues  = z.infer<typeof waitingListSchema>
export type QueryFormValues        = z.infer<typeof querySchema>
export type IncidentFormValues     = z.infer<typeof incidentSchema>
export type InvoiceFormValues      = z.infer<typeof invoiceSchema>
export type GiftVoucherFormValues  = z.infer<typeof giftVoucherSchema>
export type KnowledgeBaseFormValues = z.infer<typeof knowledgeBaseSchema>
