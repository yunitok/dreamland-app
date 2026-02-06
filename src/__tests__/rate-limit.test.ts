import { describe, it, expect, beforeEach } from 'vitest'
import { 
  checkRateLimit, 
  resetRateLimit, 
  checkAIRateLimit,
  AI_RATE_LIMITS 
} from '@/lib/rate-limit'

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clean up between tests
    resetRateLimit('test-key')
    resetRateLimit('ai:groq:user-1')
    resetRateLimit('ai:gemini:user-1')
  })

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const result = checkRateLimit('test-key', 5, 60000)
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('should decrement remaining count', () => {
      checkRateLimit('test-key', 5, 60000)
      const result = checkRateLimit('test-key', 5, 60000)
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(3)
    })

    it('should block when limit reached', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-key', 5, 60000)
      }
      
      const result = checkRateLimit('test-key', 5, 60000)
      
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeDefined()
    })

    it('should reset after calling resetRateLimit', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-key', 5, 60000)
      }
      
      resetRateLimit('test-key')
      const result = checkRateLimit('test-key', 5, 60000)
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })
  })

  describe('checkAIRateLimit', () => {
    it('should apply Groq limits', () => {
      const result = checkAIRateLimit('user-1', 'groq')
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(AI_RATE_LIMITS.groq.requestsPerMinute - 1)
    })

    it('should apply Gemini limits', () => {
      const result = checkAIRateLimit('user-1', 'gemini')
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(AI_RATE_LIMITS.gemini.requestsPerMinute - 1)
    })
  })
})
