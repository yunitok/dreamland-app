"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/actions/rbac"
import { getSession } from "@/lib/auth"
import { querySchema, QueryFormValues } from "@/modules/atc/domain/schemas"
import { QueryStatus } from "@prisma/client"

export async function getQueries(status?: QueryStatus) {
  await requirePermission("atc", "read")
  try {
    const queries = await prisma.query.findMany({
      where: status ? { status } : undefined,
      include: {
        category: true,
        resolutions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: queries }
  } catch (error) {
    console.error("Error fetching queries:", error)
    return { success: false, error: "Error al cargar las consultas" }
  }
}

export async function createQuery(data: QueryFormValues) {
  await requirePermission("atc", "manage")
  try {
    const validated = querySchema.parse(data)
    const query = await prisma.query.create({ data: validated })

    // Búsqueda en base de conocimiento para respuesta automática
    const aiResponse = await generateAIResponse(data.guestInput, data.categoryId)
    if (aiResponse) {
      await prisma.queryResolution.create({
        data: {
          queryId: query.id,
          responseText: aiResponse.text,
          source: "AI",
        },
      })
      await prisma.query.update({
        where: { id: query.id },
        data: {
          status: "RESOLVED",
          resolvedBy: "AI",
          confidenceScore: aiResponse.confidence,
        },
      })
    }

    revalidatePath("/atc/queries")
    return { success: true, data: query }
  } catch (error) {
    console.error("Error creating query:", error)
    return { success: false, error: "Error al registrar la consulta" }
  }
}

export async function resolveQueryManually(id: string, responseText: string) {
  await requirePermission("atc", "manage")
  try {
    await prisma.queryResolution.create({
      data: { queryId: id, responseText, source: "HUMAN" },
    })
    await prisma.query.update({
      where: { id },
      data: { status: "RESOLVED", resolvedBy: "HUMAN" },
    })
    revalidatePath("/atc/queries")
    return { success: true }
  } catch (error) {
    console.error("Error resolving query:", error)
    return { success: false, error: "Error al resolver la consulta" }
  }
}

export async function escalateQuery(id: string) {
  await requirePermission("atc", "manage")
  try {
    await prisma.query.update({
      where: { id },
      data: { status: "ESCALATED" },
    })
    revalidatePath("/atc/queries")
    return { success: true }
  } catch (error) {
    console.error("Error escalating query:", error)
    return { success: false, error: "Error al escalar la consulta" }
  }
}

export async function getQueryCategories() {
  await requirePermission("atc", "read")
  try {
    const categories = await prisma.queryCategory.findMany({ orderBy: { name: "asc" } })
    return { success: true, data: categories }
  } catch (error) {
    console.error("Error fetching query categories:", error)
    return { success: false, error: "Error al cargar las categorías" }
  }
}

export async function searchKnowledgeBase(query: string, categoryId?: string) {
  await requirePermission("atc", "read")
  try {
    const results = await prisma.knowledgeBase.findMany({
      where: {
        active: true,
        ...(categoryId ? { categoryId } : {}),
        OR: [
          { title:   { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
    })
    return { success: true, data: results }
  } catch (error) {
    console.error("Error searching knowledge base:", error)
    return { success: false, error: "Error al buscar en la base de conocimiento" }
  }
}

export async function submitChatFeedback(
  userMessage: string,
  feedback: 1 | -1
) {
  await requirePermission("atc", "read")
  const session = await getSession()
  if (!session) return { success: false, error: "No autenticado" }

  try {
    const query = await prisma.query.findFirst({
      where: {
        guestInput: userMessage,
        resolvedBy: session.user.id,
        channel: "WEB_RAG",
      },
      orderBy: { createdAt: "desc" },
      include: { resolutions: { take: 1, orderBy: { createdAt: "desc" } } },
    })

    if (!query?.resolutions[0]) {
      return { success: false, error: "No se encontró la resolución" }
    }

    await prisma.queryResolution.update({
      where: { id: query.resolutions[0].id },
      data: { feedback },
    })

    return { success: true }
  } catch (error) {
    console.error("Error submitting feedback:", error)
    return { success: false, error: "Error al enviar feedback" }
  }
}

// Respuesta automática basada en base de conocimiento local
// Conectar con Claude API cuando esté disponible
async function generateAIResponse(
  userInput: string,
  categoryId: string
): Promise<{ text: string; confidence: number } | null> {
  try {
    const kbResults = await prisma.knowledgeBase.findMany({
      where: {
        active: true,
        categoryId,
        OR: [
          { content: { contains: userInput.split(" ").slice(0, 3).join(" "), mode: "insensitive" } },
        ],
      },
      take: 3,
    })

    if (!kbResults.length) return null

    const context = kbResults.map(r => `${r.title}: ${r.content}`).join("\n\n")
    return {
      text: `Basado en nuestra información: ${context.slice(0, 300)}...`,
      confidence: 0.75,
    }
  } catch {
    return null
  }
}
