
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChangePasswordForm } from '../components/auth/change-password-form'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      passwordPlaceholder: '••••••••',
      updatePassword: 'Update Password',
      updating: 'Updating...',
      success: 'Password updated successfully!',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 6 characters'
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
const mockUpdatePassword = vi.fn()
vi.mock('@/lib/auth', () => ({
  updatePassword: (formData: FormData) => mockUpdatePassword(formData)
}))

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    render(<ChangePasswordForm />)
    expect(screen.getByLabelText('New Password')).toBeDefined()
    expect(screen.getByLabelText('Confirm Password')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Update Password' })).toBeDefined()
  })

  it('shows error when passwords do not match', async () => {
    render(<ChangePasswordForm />)
    
    const newPassInput = screen.getByLabelText('New Password')
    const confirmPassInput = screen.getByLabelText('Confirm Password')
    const submitBtn = screen.getByRole('button', { name: 'Update Password' })

    fireEvent.change(newPassInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPassInput, { target: { value: 'password456' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeDefined()
    })
    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })

  it('shows error when password is too short', async () => {
    render(<ChangePasswordForm />)
    
    const newPassInput = screen.getByLabelText('New Password')
    const confirmPassInput = screen.getByLabelText('Confirm Password')
    const submitBtn = screen.getByRole('button', { name: 'Update Password' })

    fireEvent.change(newPassInput, { target: { value: '123' } })
    fireEvent.change(confirmPassInput, { target: { value: '123' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeDefined()
    })
    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })

  it('calls updatePassword on valid submission', async () => {
    mockUpdatePassword.mockResolvedValue({ success: true })
    render(<ChangePasswordForm />)
    
    const newPassInput = screen.getByLabelText('New Password')
    const confirmPassInput = screen.getByLabelText('Confirm Password')
    const submitBtn = screen.getByRole('button', { name: 'Update Password' })

    fireEvent.change(newPassInput, { target: { value: 'newsecurepassword' } })
    fireEvent.change(confirmPassInput, { target: { value: 'newsecurepassword' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
        expect(mockUpdatePassword).toHaveBeenCalled()
    })
  })

  it('displays success message on successful update', async () => {
    mockUpdatePassword.mockResolvedValue({ success: true })
    render(<ChangePasswordForm />)
    
    const newPassInput = screen.getByLabelText('New Password')
    const confirmPassInput = screen.getByLabelText('Confirm Password')
    const submitBtn = screen.getByRole('button', { name: 'Update Password' })

    fireEvent.change(newPassInput, { target: { value: 'newsecurepassword' } })
    fireEvent.change(confirmPassInput, { target: { value: 'newsecurepassword' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Password updated successfully!')).toBeDefined()
    })
  })

  it('displays error message from server', async () => {
    mockUpdatePassword.mockResolvedValue({ success: false, error: 'Server error' })
    render(<ChangePasswordForm />)
    
    const newPassInput = screen.getByLabelText('New Password')
    const confirmPassInput = screen.getByLabelText('Confirm Password')
    const submitBtn = screen.getByRole('button', { name: 'Update Password' })

    fireEvent.change(newPassInput, { target: { value: 'newsecurepassword' } })
    fireEvent.change(confirmPassInput, { target: { value: 'newsecurepassword' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeDefined()
    })
  })
})
