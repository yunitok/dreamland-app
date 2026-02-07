'use server'

import { prisma } from '@/lib/prisma'
import { getSession, SessionPayload } from '@/lib/auth'

export async function getChatSession(projectId: string) {
  const session = await getSession() as SessionPayload | null
  if (!session?.user?.id) return null

  // Find existing active session for this project/user or create new
  // For now, let's just get the most recent one or create a new one if none exists
  // In a real app, you might have multiple named sessions.
  
  let chatSession = await prisma.chatSession.findFirst({
    where: {
      projectId,
      userId: session.user.id
    },
    orderBy: {
      updatedAt: 'desc'
    },
    include: {
      messages: {
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  })

  if (!chatSession) {
    chatSession = await prisma.chatSession.create({
      data: {
        projectId,
        userId: session.user.id,
      },
      include: {
        messages: true
      }
    })
  }

  return chatSession
}

export async function saveMessage(projectId: string, message: { role: string, content: string, toolInvocations?: any }) {
    const session = await getChatSession(projectId)
    if (!session) throw new Error("No session found")

    return await prisma.chatMessage.create({
        data: {
            sessionId: session.id,
            role: message.role,
            content: message.content,
            toolInvocations: message.toolInvocations ? JSON.stringify(message.toolInvocations) : undefined
        }
    })
}

export async function getHistory(projectId: string) {
    const session = await getChatSession(projectId)
    if (!session) return []
    
    return session.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        // Parse JSON if it exists, otherwise undefined
        toolInvocations: msg.toolInvocations ? JSON.parse(msg.toolInvocations as string) : undefined
    }))
}
