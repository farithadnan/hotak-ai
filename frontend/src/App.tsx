import { useMemo, useState, useRef, useEffect } from 'react'
import { SquarePen, PanelRightClose, PanelRightOpen, Copy, Volume2, ThumbsUp, ThumbsDown, RefreshCw, Plus, Briefcase, Mic, ChevronDown, Search } from 'lucide-react'
import './App.css'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ChatThread = {
  id: string
  title: string
  messages: ChatMessage[]
}

type Model = {
  id: string
  name: string
  category: string
}

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [model, setModel] = useState('gpt-4o-mini')
  const [inputValue, setInputValue] = useState('')
  const [isModelPopoverOpen, setIsModelPopoverOpen] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modelPopoverRef = useRef<HTMLDivElement>(null)
  const isMultiline = inputValue.length > 80 || inputValue.includes('\n')

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

  const chats = useMemo<ChatThread[]>(
    () => [
      {
        id: 'chat-1',
        title: 'Product Strategy',
        messages: [
          { id: 'm1', role: 'assistant', content: 'What are you working on today?' },
          { id: 'm2', role: 'user', content: 'Drafting a roadmap for Q2 and syncing with design.' },
          { id: 'm3', role: 'assistant', content: 'Got it. Do you want a milestone breakdown or a narrative summary first?' },
        ],
      },
      {
        id: 'chat-2',
        title: 'Template Ideas',
        messages: [
          { id: 'm4', role: 'assistant', content: 'Want help shaping a template system?' },
          { id: 'm5', role: 'user', content: 'Yes, make it modular and easy to reuse.' },
        ],
      },
    ],
    []
  )

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null
  const lastUserMessageId = activeChat
    ? [...activeChat.messages].reverse().find((message) => message.role === 'user')?.id || null
    : null

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  // Close model popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelPopoverRef.current && !modelPopoverRef.current.contains(event.target as Node)) {
        setIsModelPopoverOpen(false)
        setModelSearch('')
      }
    }

    if (isModelPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isModelPopoverOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }

  const handleModelSelect = (modelId: string) => {
    setModel(modelId)
    setIsModelPopoverOpen(false)
    setModelSearch('')
  }

  return (
    <div className="app-shell">
      <aside className={isSidebarCollapsed ? 'sidebar is-collapsed' : 'sidebar'}>
        <div className="sidebar-header">
          <div className="logo-wrap">
            <div className="logo-mark">HA</div>
            {isSidebarCollapsed && (
              <button
                className="icon-button sidebar-toggle is-replace"
                type="button"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                aria-label="Open sidebar"
                title="Open sidebar"
              >
                <PanelRightClose size={16} />
              </button>
            )}
          </div>
          {!isSidebarCollapsed && (
            <button
              className="icon-button sidebar-toggle"
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <PanelRightOpen size={16} />
            </button>
          )}
        </div>

        <div className="sidebar-section">
          <button className="primary-button" type="button" title="New Chat">
            <span className="new-chat-icon"><SquarePen size={16} /></span>
            <span className="new-chat-text">New Chat</span>
          </button>
        </div>

        <div className="sidebar-section">
          <div className="section-title">Templates</div>
          <button className="sidebar-item" type="button">
            Research Workspace
          </button>
          <button className="sidebar-item" type="button">
            Product Docs
          </button>
        </div>

        <div className="sidebar-section sidebar-section--scroll">
          <div className="section-title">Chats</div>
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={chat.id === activeChatId ? 'sidebar-item is-active' : 'sidebar-item'}
              type="button"
              onClick={() => setActiveChatId(chat.id)}
            >
              {chat.title}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="profile-button" type="button">
            <span className="profile-avatar">U</span>
            {!isSidebarCollapsed && <span className="profile-name">User Profile</span>}
          </button>
        </div>
      </aside>

      <main className={activeChat ? 'main-panel' : 'main-panel is-empty'}>
        <header className="main-header">
          <div className="header-left">
            <button
              className="icon-button mobile-toggle"
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
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

        <section className="chat-area">
          {!activeChat && (
            <div className="empty-state">
              <h2>Start a new conversation</h2>
              <p>Choose a template or drop in a document to get started.</p>
              <div className="composer empty-composer">
                <div className="composer-inner">
                  <div className="composer-left">
                    <button className="icon-button" type="button" title="Add Files">
                      <Plus size={20} />
                    </button>
                    <button className="icon-button" type="button" title="Tools">
                      <Briefcase size={20} />
                    </button>
                  </div>
                  <div className="composer-input">
                    {isMultiline ? (
                      <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        placeholder="Ask anything..."
                        aria-label="Chat input"
                        rows={1}
                      />
                    ) : (
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask anything..."
                        aria-label="Chat input"
                      />
                    )}
                  </div>
                  <div className="composer-right">
                    <button className="icon-button" type="button" title="Use Microphone">
                      <Mic size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeChat && (
            <div className="chat-scroll">
              {activeChat.messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === 'user'
                      ? message.id === lastUserMessageId
                        ? 'message-row user is-last'
                        : 'message-row user'
                      : 'message-row assistant'
                  }
                >
                  {message.role === 'user' && (
                    <div className="message-block">
                      <div className="message-timestamp">11/02/2026 at 10:41 AM</div>
                      <div className="bubble">{message.content}</div>
                      {message.id === lastUserMessageId && (
                        <div className="message-actions">
                          <button className="ghost-button" type="button" title="Copy">
                            <Copy size={14} />
                          </button>
                          <button className="ghost-button" type="button" title="Edit">
                            <SquarePen size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {message.role === 'assistant' && (
                    <div className="assistant-block">
                      <div className="message-timestamp">11/02/2026 at 10:41 AM</div>
                      <div className="assistant-text">{message.content}</div>
                      <div className="assistant-actions">
                        <button className="ghost-button" type="button" title="Copy">
                          <Copy size={14} />
                        </button>
                        <button className="ghost-button" type="button" title="Read aloud">
                          <Volume2 size={14} />
                        </button>
                        <button className="ghost-button" type="button" title="Good response">
                          <ThumbsUp size={14} />
                        </button>
                        <button className="ghost-button" type="button" title="Bad response">
                          <ThumbsDown size={14} />
                        </button>
                        <button className="ghost-button" type="button" title="Regenerate">
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {activeChat && (
          <footer className="composer">
            <div className="composer-inner">
              <div className="composer-left">
                <button className="icon-button" type="button" title="Add Files">
                  <Plus size={20} />
                </button>
                <button className="icon-button" type="button" title="Tools">
                  <Briefcase size={20} />
                </button>
              </div>
              <div className="composer-input">
                {isMultiline ? (
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="Ask anything..."
                    aria-label="Chat input"
                    rows={1}
                  />
                ) : (
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask anything..."
                    aria-label="Chat input"
                  />
                )}
              </div>
              <div className="composer-right">
                <button className="icon-button" type="button" title="Use Microphone">
                  <Mic size={20} />
                </button>
              </div>
            </div>
          </footer>
        )}
      </main>
    </div>
  )
}

export default App
