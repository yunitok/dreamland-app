"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/actions/rbac"
import { getSession } from "@/lib/auth"
import { emailTemplateSchema, type EmailTemplateFormValues } from "@/modules/atc/domain/schemas"

export async function getEmailTemplates(categoryId?: string) {
  await requirePermission("atc", "read")

  try {
    const templates = await prisma.emailTemplate.findMany({
      where: {
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        author: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    return { success: true, data: templates }
  } catch {
    return { success: false, error: "Error al cargar las plantillas" }
  }
}

export async function getAllEmailTemplates() {
  await requirePermission("atc", "manage")

  try {
    const templates = await prisma.emailTemplate.findMany({
      include: {
        category: { select: { id: true, name: true, color: true } },
        author: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    return { success: true, data: templates }
  } catch {
    return { success: false, error: "Error al cargar las plantillas" }
  }
}

export async function createEmailTemplate(data: EmailTemplateFormValues) {
  await requirePermission("atc", "manage")
  const session = await getSession()
  if (!session) return { success: false, error: "No autorizado" }

  const parsed = emailTemplateSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  try {
    const template = await prisma.emailTemplate.create({
      data: {
        ...parsed.data,
        createdBy: session.user.id,
      },
    })

    revalidatePath("/atc/backoffice/templates")
    return { success: true, data: template }
  } catch {
    return { success: false, error: "Error al crear la plantilla" }
  }
}

export async function updateEmailTemplate(id: string, data: EmailTemplateFormValues) {
  await requirePermission("atc", "manage")

  const parsed = emailTemplateSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  try {
    const template = await prisma.emailTemplate.update({
      where: { id },
      data: parsed.data,
    })

    revalidatePath("/atc/backoffice/templates")
    return { success: true, data: template }
  } catch {
    return { success: false, error: "Error al actualizar la plantilla" }
  }
}

export async function deleteEmailTemplate(id: string) {
  await requirePermission("atc", "manage")

  try {
    await prisma.emailTemplate.update({
      where: { id },
      data: { isActive: false },
    })

    revalidatePath("/atc/backoffice/templates")
    return { success: true }
  } catch {
    return { success: false, error: "Error al eliminar la plantilla" }
  }
}

/**
 * Renderiza una plantilla reemplazando variables dinámicas.
 * Variables soportadas: {nombre}, {fecha}, {asunto}, {email}
 */
export async function renderTemplate(
  templateId: string,
  variables: Record<string, string>
) {
  await requirePermission("atc", "read")

  try {
    const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } })
    if (!template) return { success: false, error: "Plantilla no encontrada" }

    let subject = template.subject
    let bodyHtml = template.bodyHtml

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, "g")
      subject = subject.replace(regex, value)
      bodyHtml = bodyHtml.replace(regex, value)
    }

    return { success: true, data: { subject, bodyHtml } }
  } catch {
    return { success: false, error: "Error al renderizar la plantilla" }
  }
}
