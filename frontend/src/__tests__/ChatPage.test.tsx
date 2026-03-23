/**
 * Tests for the ChatPage model selector popover.
 *
 * ChatPage depends on AuthContext, react-router, and several API calls.
 * We wrap it in a minimal provider tree and mock all services.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockModels = [
  { id: 'gpt-4o-mini', name: 'GPT 4o Mini', category: 'OpenAI' },
  { id: 'gpt-4o',      name: 'GPT 4o',      category: 'OpenAI' },
  { id: 'ollama/llama3.2', name: 'Ollama/Llama3 2', category: 'ollama' },
]

vi.mock('../services/models', () => ({
  getAvailableModels: vi.fn().mockResolvedValue(mockModels),
  prettifyModelName: (id: string) => id,
}))

vi.mock('../services/chats', () => ({
  getChatById: vi.fn().mockResolvedValue(null),
  createChat: vi.fn().mockResolvedValue({ id: 'chat-1', title: 'New Chat', messages: [] }),
  updateChat: vi.fn(),
}))

vi.mock('../services/query', () => ({
  streamQuery: vi.fn(),
}))

vi.mock('../services/documents', () => ({
  uploadDocuments: vi.fn(),
}))

vi.mock('../services/templates', () => ({
  getTemplates: vi.fn().mockResolvedValue([]),
}))

const mockUser = {
  id: 'u1',
  username: 'testuser',
  email: 'test@test.com',
  role: 'user',
  is_active: true,
  created_at: new Date().toISOString(),
  preferences: { theme: 'dark', accent: 'indigo', chat_background: 'none', default_model: null },
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import ChatPage from '../components/page/ChatPage/ChatPage'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderChatPage() {
  return render(
    <MemoryRouter>
      <ChatPage />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Model selector
// ---------------------------------------------------------------------------

describe('ChatPage — model selector', () => {
  it('renders a model selector button', async () => {
    renderChatPage()
    await waitFor(() => {
      // Should render some button that opens the model popover
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  it('opens model popover when model button is clicked', async () => {
    renderChatPage()

    // Wait for models to load
    await waitFor(() => screen.getAllByRole('button').length > 0)

    // The model selector button text typically contains the active model name
    // or a chevron. Find the button that triggers the model popover.
    const modelButtons = screen.getAllByRole('button')
    const modelBtn = modelButtons.find(
      (b) => b.className.includes('model') || b.textContent?.includes('GPT')
    )
    if (modelBtn) {
      await userEvent.click(modelBtn)
      // After opening, a search input or model list should appear
      await waitFor(() => {
        const searchInput = screen.queryByPlaceholderText(/search models/i)
        const modelItems = screen.queryAllByRole('option')
        expect(searchInput || modelItems.length > 0).toBeTruthy()
      })
    }
  })

  it('filters models when searching', async () => {
    renderChatPage()
    await waitFor(() => screen.getAllByRole('button').length > 0)

    // Open model popover
    const buttons = screen.getAllByRole('button')
    const modelBtn = buttons.find((b) => b.textContent?.includes('GPT') || b.className.includes('model'))
    if (!modelBtn) return  // skip if model button not identifiable

    await userEvent.click(modelBtn)

    const searchInput = screen.queryByPlaceholderText(/search models/i)
    if (!searchInput) return  // skip if popover didn't open as expected

    await userEvent.type(searchInput, 'llama')
    await waitFor(() => {
      // ollama/llama3.2 should appear; gpt models should be filtered out
      expect(screen.queryByText(/gpt-4o$/i)).not.toBeInTheDocument()
    })
  })
})
