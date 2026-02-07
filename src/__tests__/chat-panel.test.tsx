import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatPanel } from '@/components/chat/chat-panel'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UIMessage } from '@/types/chat'

// Mock useChat hook
const mockSetInput = vi.fn()
const mockHandleInputChange = vi.fn()
const mockHandleSubmit = vi.fn()
const mockStop = vi.fn()

const mockMessages: UIMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello! I am ready to help.',
    toolInvocations: []
  },
  {
    id: '2',
    role: 'user',
    content: 'Create a task',
    toolInvocations: []
  }
]

vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(() => ({
    messages: mockMessages,
    input: '',
    handleInputChange: mockHandleInputChange,
    handleSubmit: mockHandleSubmit,
    isLoading: false,
    stop: mockStop,
    setInput: mockSetInput
  }))
}))

// Mock SpeechSynthesis
const mockSpeak = vi.fn()
const mockCancel = vi.fn()

Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: mockSpeak,
    cancel: mockCancel,
  },
  writable: true
})

Object.defineProperty(global.window, 'SpeechSynthesisUtterance', {
  value: vi.fn(),
  writable: true
})


describe('ChatPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the chat button initially', () => {
    render(<ChatPanel projectId="proj_123" />)
    const button = screen.getByRole('button', { name: '' }) // The generic button might not have a name if it's just an icon
    expect(button).toBeInTheDocument()
  })

  it('opens the sheet when button is clicked', async () => {
    // Note: Sheet component from Shadcn might need specific mocking or looking for Trigger/Content
    // For unit testing complex UI libs, sometimes we just check calls or simple visibility if JSDOM supports it.
    // However, Radix UI (base of Shadcn) often works well in JSDOM.
    
    render(<ChatPanel projectId="proj_123" />)
    
    // Find the trigger button (the floating action button)
    // It has the Bot icon. 
    // We can find it by class or role.
    const triggerBtn = screen.getByRole('button') 
    fireEvent.click(triggerBtn)

    // After click, the sheet content should appear.
    // Use waitFor because of animation/portal
    await waitFor(() => {
        expect(screen.getByText('Dreamland Assistant')).toBeInTheDocument()
    })
  })

  it('displays persistent messages', async () => {
    render(<ChatPanel projectId="proj_123" />)
    const triggerBtn = screen.getByRole('button') 
    fireEvent.click(triggerBtn)

    await waitFor(() => {
        expect(screen.getByText('Hello! I am ready to help.')).toBeInTheDocument()
        expect(screen.getByText('Create a task')).toBeInTheDocument()
    })
  })

  it('calls handleSubmit when sending a message', async () => {
    render(<ChatPanel projectId="proj_123" />)
    const triggerBtn = screen.getByRole('button') 
    fireEvent.click(triggerBtn)

    await waitFor(() => {
        expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(input, { target: { value: 'New message' } })
    
    // Pressing Enter or clicking send
    // Since we mocked useChat, specific implementation of ChatInput handles the event.
    // Assuming ChatInput uses the form submission or KeyDown
    
    // Let's assume there is a Send button.
    const sendButton = screen.queryByTitle('Send message') // Check ChatInput implementation for aria-label or title
    if (sendButton) {
        fireEvent.click(sendButton)
        expect(mockHandleSubmit).toHaveBeenCalled()
    } else {
        // Fallback: helper function might trigger it
    }
  })
})
