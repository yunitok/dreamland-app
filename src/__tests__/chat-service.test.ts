import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveMessage, getHistory } from '@/lib/actions/chat'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    chatSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
    }
  }
}))

// Mock Auth
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'user_123' } })),
  SessionPayload: {} 
}))

describe('Chat Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('saveMessage', () => {
    it('creates a new session if none exists and saves message', async () => {
      // Mock no existing session
      vi.mocked(prisma.chatSession.findFirst).mockResolvedValue(null)
      
      // Mock session creation
      vi.mocked(prisma.chatSession.create).mockResolvedValue({
        id: 'session_new',
        projectId: 'proj_1',
        userId: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        title: null
      } as any)

      // Mock message creation
      vi.mocked(prisma.chatMessage.create).mockResolvedValue({
        id: 'msg_1',
        sessionId: 'session_new',
        role: 'user',
        content: 'Hello',
        toolInvocations: null, // Prisma expects JSON string or null/undefined depending on type, usually string/null for 'String?'
      } as any)

      await saveMessage('proj_1', { role: 'user', content: 'Hello' })

      expect(prisma.chatSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({ 
        where: expect.objectContaining({ projectId: 'proj_1' }) 
      }))
      expect(prisma.chatSession.create).toHaveBeenCalled()
      expect(prisma.chatMessage.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
            sessionId: 'session_new',
            role: 'user',
            content: 'Hello'
        })
      }))
    })

    it('uses existing session if available', async () => {
      // Mock existing session
      vi.mocked(prisma.chatSession.findFirst).mockResolvedValue({
        id: 'session_existing',
        projectId: 'proj_1',
        userId: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        title: null, 
        messages: [] // include mocks need this
      } as any)

      await saveMessage('proj_1', { role: 'assistant', content: 'Hi there' })

      expect(prisma.chatSession.create).not.toHaveBeenCalled()
      expect(prisma.chatMessage.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
            sessionId: 'session_existing',
            role: 'assistant'
        })
      }))
    })
  })

  describe('getHistory', () => {
    it('returns formatted messages from session', async () => {
         vi.mocked(prisma.chatSession.findFirst).mockResolvedValue({
            id: 'session_1',
            projectId: 'proj_1',
            userId: 'user_123',
            createdAt: new Date(),
            updatedAt: new Date(),
            title: null,
            messages: [
                { id: 'm1', role: 'user', content: 'Hi', toolInvocations: null },
                { id: 'm2', role: 'assistant', content: 'Hello', toolInvocations: '{"some":"json"}' }
            ]
          } as any)

          const history = await getHistory('proj_1')
          
          expect(history).toHaveLength(2)
          expect(history[0].content).toBe('Hi')
          expect(history[1].toolInvocations).toEqual({ some: 'json' })
    })

    it('returns empty array if no session found', async () => {
        vi.mocked(prisma.chatSession.findFirst).mockResolvedValue(null)
        // If findFirst returns null, getChatSession creates one? 
        // Let's check implementation. getChatSession has side effect of creating session!
        // So getHistory will execute getChatSession -> which creates a session -> returns empty messages.
        
        vi.mocked(prisma.chatSession.create).mockResolvedValue({
            id: 'session_new',
            messages: []
        } as any)

        const history = await getHistory('proj_1')
        expect(history).toEqual([])
    })
  })
})
