import { useMemo, useState, useRef, useEffect } from 'react'
import { SquarePen, PanelRightClose, PanelRightOpen, ChevronDown, Search, Settings, Archive, LogOut, BookType } from 'lucide-react'
import { useClickOutside } from './hooks/useClickOutside'
// ...existing code...
import TemplateList from './components/page/TemplateList/TemplateList'
import TemplateBuilder from './components/page/TemplateBuilder/TemplateBuilder'
import ChatWindow from './components/page/ChatWindow/ChatWindow'
import type { ChatThread, Model } from './types'
import './App.css'

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'chat' | 'templates' | 'template-create'>('chat')
  const [model, setModel] = useState('gpt-4o-mini')
  const [inputValue, setInputValue] = useState('')
  const [chats, setChats] = useState<ChatThread[]>([{
    id: 'chat-1',
    title: 'Product Strategy',
    messages: [
      { id: 'm1', role: 'assistant', content: 'What are you working on today?' },
      { id: 'm2', role: 'user', content: 'Drafting a roadmap for Q2 and syncing with design.' },
      { id: 'm3', role: 'assistant', content: 'Got it. Do you want a milestone breakdown or a narrative summary first?' },
    ],
  }, {
    id: 'chat-2',
    title: 'Template Ideas',
    messages: [
      { id: 'm4', role: 'assistant', content: 'Want help shaping a template system?' },
      { id: 'm5', role: 'user', content: 'Yes, make it modular and easy to reuse.' },
    ],
  }])
  const [isModelPopoverOpen, setIsModelPopoverOpen] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState(false)
  const [profilePopoverPosition, setProfilePopoverPosition] = useState({ top: 0, left: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modelPopoverRef = useRef<HTMLDivElement>(null)
  const profilePopoverRef = useRef<HTMLDivElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const username = 'Avery'

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

  // ...existing code...

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null
  const hasChatSession = Boolean(activeChat)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      // Only show scrollbar when content exceeds max-height
      textareaRef.current.style.overflowY = textareaRef.current.scrollHeight > 200 ? 'auto' : 'hidden'
    }
  }, [inputValue])

  // Close popovers on click outside
  useClickOutside(
    modelPopoverRef,
    () => {
      setIsModelPopoverOpen(false)
      setModelSearch('')
    },
    isModelPopoverOpen
  )

  useClickOutside(profilePopoverRef, () => setIsProfilePopoverOpen(false), isProfilePopoverOpen)

  // Calculate profile popover position
  useEffect(() => {
    if (isProfilePopoverOpen && profileButtonRef.current) {
      const buttonRect = profileButtonRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const gap = 8
      
      // Responsive popover width
      const isMobile = viewportWidth <= 900
      const maxPopoverWidth = isMobile ? Math.min(220, viewportWidth - 32) : 240
      const popoverHeight = 200

      let top = 0
      let left = 0

      if (isSidebarCollapsed) {
        // Position to the right when collapsed
        left = buttonRect.right + gap
        top = buttonRect.top

        // Check if popover goes off the right edge
        if (left + maxPopoverWidth > viewportWidth - gap) {
          left = buttonRect.left - maxPopoverWidth - gap
        }

        // Check if popover goes off the bottom edge
        if (top + popoverHeight > viewportHeight) {
          top = viewportHeight - popoverHeight - gap
        }

        // Check if popover goes off the top edge
        if (top < gap) {
          top = gap
        }
      } else {
        // Position above when expanded
        left = buttonRect.left
        top = buttonRect.top - popoverHeight - gap

        // Check if popover goes off the top edge
        if (top < gap) {
          // Position below instead
          top = buttonRect.bottom + gap
        }

        // Check if popover goes off the right edge
        if (left + maxPopoverWidth > viewportWidth - gap) {
          left = viewportWidth - maxPopoverWidth - gap
        }

        // Check if popover goes off the left edge
        if (left < gap) {
          left = gap
        }
      }

      setProfilePopoverPosition({ top, left })
    }
  }, [isProfilePopoverOpen, isSidebarCollapsed])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    if (!inputValue.trim() || !activeChatId) {
      return
    }
    // Add new message to the active chat
    setChats((prevChats) => prevChats.map(chat => {
      if (chat.id === activeChatId) {
        return {
          ...chat,
          messages: [
            ...chat.messages,
            {
              id: `m${Date.now()}`,
              role: 'user',
              content: inputValue,
            },
          ],
        }
      }
      return chat
    }))
    setInputValue('')
  }

  const handleOpenTemplates = () => {
    setActiveView('templates')
  }

  const handleOpenChat = (chatId?: string) => {
    setActiveView('chat')
    if (chatId === undefined) {
      return
    }
    setActiveChatId(chatId)
  }

  const handleNewChat = () => {
    // Create a new chat object
    const newChatId = `chat-${Date.now()}`
    const newChat: ChatThread = {
      id: newChatId,
      title: 'New Chat',
      messages: [],
    }
    setChats((prev) => [...prev, newChat])
    setActiveView('chat')
    setActiveChatId(newChatId)
    setInputValue('')
  }


  const handleBackToTemplates = () => {
    setActiveView('templates')
  }

  const handleModelSelect = (modelId: string) => {
    setModel(modelId)
    setIsModelPopoverOpen(false)
    setModelSearch('')
  }

  return (
    <div className="app-shell">
      {/* Mobile backdrop */}
      {!isSidebarCollapsed && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarCollapsed(true)} />
      )}

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
          <button className="primary-button" type="button" title="New Chat" onClick={handleNewChat}>
            <span className="new-chat-icon"><SquarePen size={16} /></span>
            <span className="new-chat-text">New Chat</span>
          </button>
        </div>

        <div className="sidebar-section">
          <button className="primary-button" type="button" title="Templates" onClick={handleOpenTemplates}>
            <span className="new-chat-icon"><BookType size={18} /></span>
            <span className="new-chat-text">Templates</span>
          </button>
        </div>

        <div className="sidebar-section sidebar-section--scroll">
          <div className="section-title">Chats</div>
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={chat.id === activeChatId ? 'sidebar-item is-active' : 'sidebar-item'}
              type="button"
              onClick={() => handleOpenChat(chat.id)}
            >
              {chat.title}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="profile-wrapper" ref={profilePopoverRef}>
            <button
              ref={profileButtonRef}
              className="profile-button" 
              type="button"
              onClick={() => setIsProfilePopoverOpen(!isProfilePopoverOpen)}
            >
              <span className="profile-avatar">U</span>
              {!isSidebarCollapsed && <span className="profile-name">User Profile</span>}
            </button>
            {isProfilePopoverOpen && (
              <div 
                className="profile-popover" 
                style={{
                  position: 'fixed',
                  top: `${profilePopoverPosition.top}px`,
                  left: `${profilePopoverPosition.left}px`
                }}
              >
                <div className="profile-menu-header">
                  <span className="profile-menu-avatar">U</span>
                  <div className="profile-menu-info">
                    <div className="profile-menu-name">User Profile</div>
                    <div className="profile-menu-email">user@example.com</div>
                  </div>
                </div>
                <hr className="profile-menu-divider" />
                <button className="profile-menu-item" type="button">
                  <Settings size={18} />
                  <span>Settings</span>
                </button>
                <button className="profile-menu-item" type="button">
                  <Archive size={18} />
                  <span>Archived Chats</span>
                </button>
                <button className="profile-menu-item" type="button">
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className={activeView === 'chat' && !hasChatSession ? 'main-panel is-empty' : 'main-panel'}>
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
            {activeView === 'chat' ? (
              <div className="model-selector" ref={modelPopoverRef}>
                <button
                  className="model-selector-button"
                  type="button"
                  onClick={() => {
                    setIsModelPopoverOpen(!isModelPopoverOpen)
                    setIsSidebarCollapsed(true)
                  }}
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
            ) : (
              <div className="header-title">
                {activeView === 'templates' ? 'Templates' : 'New Template'}
              </div>
            )}
          </div>
          <div className="header-right"></div>
        </header>

        {activeView === 'chat' && (
          <ChatWindow
            chat={activeChat}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
            textareaRef={textareaRef}
            username={username}
            hasChatSession={hasChatSession}
          />
        )}

        {activeView === 'templates' && (
          <TemplateList />
        )}

        {activeView === 'template-create' && (
          <TemplateBuilder
            open={activeView === 'template-create'}
            onClose={handleBackToTemplates}
            mode="create"
            onSuccess={() => setActiveView('templates')}
          />
        )}

        {/* Composer is only rendered inside ChatWindow, not here */}
      </main>
    </div>
  )
}

export default App
