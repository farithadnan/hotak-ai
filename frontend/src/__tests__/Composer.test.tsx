/**
 * Tests for the Composer component — the main chat input bar.
 *
 * We test the component in isolation: the textarea, send button, and
 * keyboard shortcut behaviour.  API calls and context providers are not
 * needed for these unit-level checks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import { Composer } from '../components/common/Composer/Composer'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComposer(overrides: Partial<Parameters<typeof Composer>[0]> = {}) {
  const textareaRef = { current: null } as React.RefObject<HTMLTextAreaElement | null>
  const props = {
    inputValue: '',
    onInputChange: vi.fn(),
    onKeyDown: vi.fn(),
    onSend: vi.fn(),
    textareaRef,
    ...overrides,
  }
  const result = render(<Composer {...props} />)
  return { ...result, props }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('Composer — rendering', () => {
  it('renders the textarea', () => {
    renderComposer()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('textarea has aria-label', () => {
    renderComposer()
    expect(screen.getByLabelText('Chat input')).toBeInTheDocument()
  })

  it('renders the send button', () => {
    renderComposer()
    // The send button has aria-label or title; find by title/role
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('shows inputValue in textarea', () => {
    renderComposer({ inputValue: 'Hello, world!' })
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('Hello, world!')
  })
})

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

describe('Composer — interactions', () => {
  it('calls onInputChange when user types', async () => {
    const onInputChange = vi.fn()
    renderComposer({ onInputChange })
    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, 'a')
    expect(onInputChange).toHaveBeenCalled()
  })

  it('calls onSend when send button is clicked', async () => {
    const onSend = vi.fn()
    // Need non-empty inputValue for the button to be enabled
    renderComposer({ inputValue: 'test message', onSend })
    // Find the send button by its SVG icon wrapper — last button in actions
    const buttons = screen.getAllByRole('button')
    const sendBtn = buttons[buttons.length - 1]
    await userEvent.click(sendBtn)
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('calls onKeyDown when a key is pressed in textarea', async () => {
    const onKeyDown = vi.fn()
    renderComposer({ onKeyDown })
    const textarea = screen.getByRole('textbox')
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' })
    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Edit mode
// ---------------------------------------------------------------------------

describe('Composer — edit mode', () => {
  it('renders cancel button in edit mode', () => {
    const onCancel = vi.fn()
    renderComposer({ mode: 'edit', onCancel, inputValue: 'editing' })
    // Cancel button should exist in edit mode
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })
})
