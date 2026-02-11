'use server'

import { prisma } from '@/lib/prisma'
import { getSession, SessionPayload } from '@/lib/auth'

export async function getChatSession(projectId: string, sessionId?: string) {
  const session = await getSession() as SessionPayload | null
  if (!session?.user?.id) return null

  // If a specific session ID is provided, try to find it
  if (sessionId) {
      const chatSession = await prisma.chatSession.findUnique({
          where: {
              id: sessionId,
              // Security check: ensure the session belongs to the user and project
              userId: session.user.id,
              projectId
          },
          include: {
              messages: {
                  orderBy: {
                      createdAt: 'asc'
                  }
              }
          }
      })
      
      if (chatSession) return chatSession
  }

  // Fallback: Find most recent active session or create a new one
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

  // If no session exists, create one
  if (!chatSession) {
   chatSession = await createChatSession(projectId)
  }

  return chatSession
}

export async function createChatSession(projectId: string) {
    const session = await getSession() as SessionPayload | null
    if (!session?.user?.id) throw new Error("Unauthorized")

    return await prisma.chatSession.create({
        data: {
            projectId,
            userId: session.user.id,
            title: `Chat ${new Date().toLocaleDateString()}`
        },
        include: {
            messages: true
        }
    })
}

export async function getChatSessions(projectId: string) {
    const session = await getSession() as SessionPayload | null
    if (!session?.user?.id) return []

    return await prisma.chatSession.findMany({
        where: {
            projectId,
            userId: session.user.id
        },
        orderBy: {
            updatedAt: 'desc'
        },
        select: {
            id: true,
            title: true,
            updatedAt: true,
            createdAt: true
        }
    })
}

export async function deleteChatSession(sessionId: string) {
    const session = await getSession() as SessionPayload | null
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    await prisma.chatSession.delete({
        where: {
            id: sessionId,
            userId: session.user.id // Security check
        }
    })

    return { success: true }
}

export async function saveMessage(projectId: string, message: { role: string, content: string, toolInvocations?: any }, sessionId?: string) {
    // If sessionId is provided, use it. Otherwise get the default/latest one.
    const session = await getChatSession(projectId, sessionId)
    if (!session) throw new Error("No session found")

    // Update session timestamp
    await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() }
    })

    return await prisma.chatMessage.create({
        data: {
            sessionId: session.id,
            role: message.role,
            content: message.content,
            toolInvocations: message.toolInvocations ? JSON.stringify(message.toolInvocations) : undefined
        }
    })
}

export async function getHistory(projectId: string, sessionId?: string) {
    const session = await getChatSession(projectId, sessionId)
    if (!session) return []
    
    return session.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        // Parse JSON if it exists, otherwise undefined
        toolInvocations: msg.toolInvocations ? JSON.parse(msg.toolInvocations as string) : undefined
    }))
}

export async function deleteProjectChatHistory(projectId: string) {
    // This function might need to be rethought. 
    // Does it delete ALL history for the project (all sessions)?
    // Or just the current one? 
    // Based on the name, it implies cleaning up the whole project history for the user.
    
    const session = await getSession() as SessionPayload | null
    if (!session?.user?.id) return

    await prisma.chatSession.deleteMany({
        where: {
            projectId,
            userId: session.user.id
        }
    })
    
    return { success: true }
}
