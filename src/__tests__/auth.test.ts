import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoist mocks to ensure they are available before imports
const mocks = vi.hoisted(() => {
  return {
    findUnique: vi.fn(),
    compare: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    setCookie: vi.fn(),
    getCookie: vi.fn(),
  }
})

// Mock modules
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique
    }
  }
}))

vi.mock('bcryptjs', () => ({
  compare: mocks.compare
}))

vi.mock('../lib/session', () => ({
  encrypt: mocks.encrypt,
  decrypt: mocks.decrypt
}))

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({
    set: mocks.setCookie,
    get: mocks.getCookie
  })
}))

// Import after mocks
import { login } from '../lib/auth'

describe('Auth - Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fail with invalid credentials if user not found', async () => {
    mocks.findUnique.mockResolvedValue(null)
    
    const formData = new FormData()
    formData.append('username', 'wronguser')
    formData.append('password', 'pass')

    const result = await login(formData)
    expect(result.success).toBe(false)
    expect(result.error).toBe('invalidCredentials')
  })

  it('should fail if password does not match', async () => {
    mocks.findUnique.mockResolvedValue({
      id: '1',
      username: 'user',
      password: 'hashedpassword',
    })
    mocks.compare.mockResolvedValue(false)

    const formData = new FormData()
    formData.append('username', 'user')
    formData.append('password', 'wrongpass')

    const result = await login(formData)
    expect(result.success).toBe(false)
    expect(result.error).toBe('invalidCredentials')
  })

  it('should success and set cookie if credentials are valid', async () => {
    mocks.findUnique.mockResolvedValue({
      id: '1',
      username: 'user',
      password: 'hashedpassword',
      role: {
        name: 'Admin',
        permissions: [{ action: 'view', resource: 'admin' }]
      }
    })
    mocks.compare.mockResolvedValue(true)
    mocks.encrypt.mockResolvedValue('token')

    const formData = new FormData()
    formData.append('username', 'user')
    formData.append('password', 'correctpass')

    const result = await login(formData)
    expect(result.success).toBe(true)
    expect(mocks.setCookie).toHaveBeenCalled()
    expect(mocks.encrypt).toHaveBeenCalled()
  })
})
