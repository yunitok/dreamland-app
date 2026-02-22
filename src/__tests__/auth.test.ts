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
    update: vi.fn(),
    hash: vi.fn(),
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
    expect(mocks.encrypt).toHaveBeenCalled()
  })
})

vi.mock('bcryptjs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual as any,
    compare: mocks.compare,
    hash: mocks.hash
  }
})

// Add update mock
// mocks.update is already defined in vi.hoisted
vi.mock('@/lib/prisma', async (importOriginal) => {
    const actual = await importOriginal() as any
    return {
        prisma: {
            user: {
                findUnique: mocks.findUnique,
                update: mocks.update
            }
        }
    }
})

import { updatePassword } from '../lib/auth'

describe('Auth - Update Password', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should fail if password is too short', async () => {
        const formData = new FormData()
        formData.append('newPassword', '123')
        
        const result = await updatePassword(formData)
        expect(result.success).toBe(false)
        expect(result.error).toBe('passwordTooShort')
    })

    it('should fail if unauthorized (no session)', async () => {
        mocks.decrypt.mockResolvedValue(null) // Simulate no session

        const formData = new FormData()
        formData.append('newPassword', 'newsecurepassword')

        const result = await updatePassword(formData)
        expect(result.success).toBe(false)
        expect(result.error).toBe('unauthorized')
    })

    it('should success if session exists and password is valid', async () => {
        // Mock valid session logic: getSession calls cookies().get() then decrypt()
        mocks.getCookie.mockReturnValue({ value: 'valid-session-token' })
        mocks.decrypt.mockResolvedValue({
            user: { id: 'user-1', role: 'BASIC_USER', permissions: [] },
            expires: new Date()
        })
        
        // Mock successful DB update
        mocks.update.mockResolvedValue({
            id: 'user-1',
            username: 'test',
            name: 'Test',
            role: { code: 'BASIC_USER', permissions: [] },
            mustChangePassword: false
        })

        // Mock hash
        mocks.hash.mockResolvedValue('hashed-new-password')

        const formData = new FormData()
        formData.append('newPassword', 'newsecurepassword')

        const result = await updatePassword(formData)
        
        expect(result.success).toBe(true)
        expect(mocks.update).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: {
                password: 'hashed-new-password',
                mustChangePassword: false
            },
            include: { role: { include: { permissions: true } } }
        })
        expect(mocks.setCookie).toHaveBeenCalled()
    })
})
