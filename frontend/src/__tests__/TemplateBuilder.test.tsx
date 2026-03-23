/**
 * Tests for the TemplateBuilder modal — create / edit template form.
 *
 * We mock external service calls so tests stay fast and offline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Module mocks — must be before component import
// ---------------------------------------------------------------------------

vi.mock('../services', () => ({
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
}))

vi.mock('../services/models', () => ({
  getAvailableModels: vi.fn().mockResolvedValue([
    { id: 'gpt-4o-mini', name: 'GPT 4o Mini', category: 'OpenAI' },
  ]),
  prettifyModelName: (id: string) => id,
}))

vi.mock('../services/documents', () => ({
  uploadDocuments: vi.fn(),
}))

import TemplateBuilder from '../components/page/TemplateBuilder/TemplateBuilder'
import { createTemplate } from '../services'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderBuilder(mode: 'create' | 'edit' = 'create') {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(
    <TemplateBuilder
      open={true}
      onClose={onClose}
      mode={mode}
      onSuccess={onSuccess}
    />
  )
  return { onClose, onSuccess }
}

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------

describe('TemplateBuilder — rendering', () => {
  it('renders the modal title for create mode', async () => {
    renderBuilder('create')
    await waitFor(() => {
      expect(screen.getByText(/create new template/i)).toBeInTheDocument()
    })
  })

  it('renders Basic Info and Settings tabs', async () => {
    renderBuilder()
    await waitFor(() => {
      expect(screen.getByText(/basic info/i)).toBeInTheDocument()
      expect(screen.getByText(/settings/i)).toBeInTheDocument()
    })
  })

  it('renders the Template Name input', async () => {
    renderBuilder()
    await waitFor(() => {
      expect(screen.getByLabelText(/template name/i)).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// Form validation
// ---------------------------------------------------------------------------

describe('TemplateBuilder — validation', () => {
  it('shows error when submitting without a name', async () => {
    renderBuilder()
    await waitFor(() => screen.getByText(/create new template/i))

    // Find submit button (may be on settings tab or via form submit)
    const submitBtn = screen.getByRole('button', { name: /create/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/template name is required/i)).toBeInTheDocument()
    })
  })

  it('does not show name error when name is filled', async () => {
    renderBuilder()
    await waitFor(() => screen.getByLabelText(/template name/i))

    await userEvent.type(screen.getByLabelText(/template name/i), 'My Template')

    // No validation error visible yet (before submit)
    expect(screen.queryByText(/template name is required/i)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------

describe('TemplateBuilder — tabs', () => {
  it('switches to Settings tab on click', async () => {
    renderBuilder()
    await waitFor(() => screen.getByText(/settings/i))

    await userEvent.click(screen.getByText(/settings/i))

    await waitFor(() => {
      expect(screen.getByLabelText(/system prompt/i)).toBeInTheDocument()
    })
  })

  it('switching back to Basic Info shows the name field again', async () => {
    renderBuilder()
    await waitFor(() => screen.getByText(/settings/i))
    await userEvent.click(screen.getByText(/settings/i))
    await userEvent.click(screen.getByText(/basic info/i))

    await waitFor(() => {
      expect(screen.getByLabelText(/template name/i)).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

describe('TemplateBuilder — submission', () => {
  beforeEach(() => {
    vi.mocked(createTemplate).mockResolvedValue({
      id: '1',
      name: 'Test Template',
      description: '',
      sources: [],
      settings: {},
    } as any)
  })

  it('calls createTemplate with the entered name', async () => {
    const { onSuccess } = renderBuilder('create')
    await waitFor(() => screen.getByLabelText(/template name/i))

    await userEvent.type(screen.getByLabelText(/template name/i), 'Test Template')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Template' })
      )
    })
  })
})
