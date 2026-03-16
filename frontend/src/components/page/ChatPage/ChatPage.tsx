import { useMemo, useRef, useState } from 'react'
import { ChevronDown, PanelRightClose, Search } from 'lucide-react'
import ChatWindow from '../ChatWindow/ChatWindow'
import type { ChatThread, Model } from '../../../types'
import { useClickOutside } from '../../../hooks/useClickOutside'

interface ChatPageProps {
  activeChat: ChatThread | null
  inputValue: string
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  onUpdateUserMessage: (messageId: string, content: string) => void
  onRegenerateAssistantMessage: (messageId: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  username: string
  onToggleSidebar: () => void
}

function ChatPage({
  activeChat,
  inputValue,
  onInputChange,
  onKeyDown,
  onSend,
  onUpdateUserMessage,
  onRegenerateAssistantMessage,
  textareaRef,
  username,
  onToggleSidebar,
}: ChatPageProps) {
  const [model, setModel] = useState('gpt-4o-mini')
  const [isModelPopoverOpen, setIsModelPopoverOpen] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const modelPopoverRef = useRef<HTMLDivElement>(null)

  const availableModels = useMemo<Model[]>(
    () => [
      { id: 'gpt-4o', name: 'GPT-4o', category: 'OpenAI' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', category: 'OpenAI' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', category: 'OpenAI' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', category: 'OpenAI' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', category: 'Anthropic' },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', category: 'Anthropic' },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', category: 'Anthropic' },
      { id: 'gemini-pro', name: 'Gemini Pro', category: 'Google' },
      { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', category: 'Google' },
    ],
    []
  )

  const filteredModels = useMemo(
    () =>
      availableModels.filter(
        (m) =>
          m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
          m.category.toLowerCase().includes(modelSearch.toLowerCase())
      ),
    [availableModels, modelSearch]
  )

  const selectedModel = availableModels.find((m) => m.id === model)

  useClickOutside(
    modelPopoverRef,
    () => {
      setIsModelPopoverOpen(false)
      setModelSearch('')
    },
    isModelPopoverOpen
  )

  const handleModelSelect = (modelId: string) => {
    setModel(modelId)
    setIsModelPopoverOpen(false)
    setModelSearch('')
  }

  return (
    <>
      <header className="main-header">
        <div className="header-left">
          <button
            className="icon-button mobile-toggle"
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <PanelRightClose size={20} />
          </button>
        </div>
        <div className="header-center">
          <div className="model-selector" ref={modelPopoverRef}>
            <button
              className="model-selector-button"
              type="button"
              onClick={() => setIsModelPopoverOpen(!isModelPopoverOpen)}
              title={selectedModel?.name || 'Select Model'}
            >
              <span className="model-selector-text">{selectedModel?.name || 'Select Model'}</span>
              <ChevronDown size={16} className="model-selector-icon" />
            </button>
            {isModelPopoverOpen && (
              <div className="model-popover">
                <div className="model-search">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search models..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="model-list">
                  {filteredModels.length === 0 ? (
                    <div className="model-empty">No models found</div>
                  ) : (
                    filteredModels.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={m.id === model ? 'model-item is-selected' : 'model-item'}
                        onClick={() => handleModelSelect(m.id)}
                      >
                        <div className="model-name">{m.name}</div>
                        <div className="model-category">{m.category}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="header-right"></div>
      </header>

      <ChatWindow
        chat={activeChat}
        inputValue={inputValue}
        onInputChange={onInputChange}
        onKeyDown={onKeyDown}
        onSend={onSend}
        onUpdateUserMessage={onUpdateUserMessage}
        onRegenerateAssistantMessage={onRegenerateAssistantMessage}
        textareaRef={textareaRef}
        username={username}
      />
    </>
  )
}

export default ChatPage
