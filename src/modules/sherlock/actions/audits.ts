"use server"

import { prisma } from "@/lib/prisma"
import { VoiceAudit } from "@prisma/client"

export type VoiceAuditWithRelations = VoiceAudit & {
  recipe: {
    name: string
  }
}

export async function getVoiceAudits() {
  return await prisma.voiceAudit.findMany({
    include: {
      recipe: true
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getVoiceAudit(id: string) {
  return await prisma.voiceAudit.findUnique({
    where: { id },
    include: {
      recipe: true
    }
  })
}
