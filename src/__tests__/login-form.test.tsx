
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginForm } from '../components/auth/login-form'

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      username: 'Username',
      password: 'Password',
      signIn: 'Sign In',
      rememberMe: 'Remember me',
      invalidCredentials: 'Invalid credentials'
    }
    return translations[key] || key
  }
}))

// Mock useRouter
const mockRouter = {
  push: vi.fn(),
  refresh: vi.fn()
}
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => mockRouter
}))

// Mock server action
const mockLogin = vi.fn()
vi.mock('@/lib/auth', () => ({
  login: (formData: FormData) => mockLogin(formData)
}))

describe('LoginForm Remember Me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders remember me checkbox', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText('Remember me')).toBeDefined()
  })

  it('sends remember field when checked', async () => {
    mockLogin.mockResolvedValue({ success: true })
    render(<LoginForm />)
    
    const usernameInput = screen.getByLabelText('Username')
    const passwordInput = screen.getByLabelText('Password')
    const rememberCheckbox = screen.getByLabelText('Remember me')
    const submitBtn = screen.getByRole('button', { name: 'Sign In' })

    fireEvent.change(usernameInput, { target: { value: 'admin' } })
    fireEvent.change(passwordInput, { target: { value: 'password' } })
    fireEvent.click(rememberCheckbox)
    fireEvent.click(submitBtn)

    await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
        const formData = mockLogin.mock.calls[0][0] as FormData
        expect(formData.get('remember')).toBe('on')
    })
  })

  it('does not send remember field when unchecked', async () => {
    mockLogin.mockResolvedValue({ success: true })
    render(<LoginForm />)
    
    const usernameInput = screen.getByLabelText('Username')
    const passwordInput = screen.getByLabelText('Password')
    // Checkbox is unchecked by default
    const submitBtn = screen.getByRole('button', { name: 'Sign In' })

    fireEvent.change(usernameInput, { target: { value: 'admin' } })
    fireEvent.change(passwordInput, { target: { value: 'password' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
        const formData = mockLogin.mock.calls[0][0] as FormData
        expect(formData.get('remember')).toBeNull() 
    })
  })
})
