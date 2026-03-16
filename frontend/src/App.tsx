import { useState, useRef, useEffect } from 'react'
import { SquarePen, PanelRightClose, PanelRightOpen, Settings, Archive, LogOut, BookType } from 'lucide-react'
import { useClickOutside } from './hooks/useClickOutside'
import TemplateList from './components/page/TemplateList/TemplateList'
import TemplateBuilder from './components/page/TemplateBuilder/TemplateBuilder'
import ChatPage from './components/page/ChatPage/ChatPage'
import { getChats, createChat, addMessage } from './services/chats'
import type { ChatThread } from './types'
import './App.css'

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'chat' | 'templates' | 'template-create'>('chat')
  const [inputValue, setInputValue] = useState('')
  const [chats, setChats] = useState<ChatThread[]>([])
  const [isLoadingChats, setIsLoadingChats] = useState(true)

  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState(false)
  const [profilePopoverPosition, setProfilePopoverPosition] = useState({ top: 0, left: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const profilePopoverRef = useRef<HTMLDivElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const username = 'Avery'
  const activeChat = chats.find((chat) => chat.id === activeChatId) || null

  // Fetch chats on mount
  useEffect(() => {
    const loadChats = async () => {
      try {
        setIsLoadingChats(true)
        const data = await getChats()
        setChats(data)
      } catch (error) {
        console.error('Failed to load chats:', error)
      } finally {
        setIsLoadingChats(false)
      }
    }
    void loadChats()
  }, [])

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

  const handleSend = async () => {
    if (!inputValue.trim()) {
      return;
    }

    try {
      let chatId = activeChatId;
      
      // 1. Create a new chat session if none is active
      if (!chatId) {
        const newChat = await createChat({
          title: inputValue.slice(0, 32) || 'New Chat'
        });
        chatId = newChat.id;
        setChats(prev => [newChat, ...prev]);
        setActiveChatId(chatId);
      }

      // 2. Create the user message object
      const userMessage: ChatThread['messages'][0] = {
        id: crypto.randomUUID(),
        role: 'user',
        content: inputValue,
        created_at: new Date().toISOString()
      };

      // 3. Update local state immediately for responsiveness
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, userMessage]
          }
        }
        return chat;
      }));
      setInputValue('');

      // 4. Save user message to backend
      await addMessage(chatId, userMessage);

      // TODO: Here we will later call the RAG agent endpoint 
      // and append the assistant's response.
      
    } catch (error) {
      console.error('Failed to send message:', error);
    }
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
    setActiveView('chat');
    setActiveChatId(null);
    setInputValue('');
  }



  const handleBackToTemplates = () => {
    setActiveView('templates')
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
          {isLoadingChats && <div className="model-empty">Loading chats...</div>}
          {!isLoadingChats && chats.length === 0 && <div className="model-empty">No chats yet</div>}
          {!isLoadingChats && chats.map((chat) => (
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

      <main className={activeView === 'chat' && (!activeChat || (activeChat && activeChat.messages.length === 0)) ? 'main-panel is-empty' : 'main-panel'}>
        {activeView !== 'chat' && (
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
              <div className="header-title">
                {activeView === 'templates' ? 'Templates' : 'New Template'}
              </div>
            </div>
            <div className="header-right"></div>
          </header>
        )}

        {activeView === 'chat' && (
          <ChatPage
            activeChat={activeChat}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
            textareaRef={textareaRef}
            username={username}
            onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
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
