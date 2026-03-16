import { useState, useRef, useEffect } from 'react'
import { Archive, BookType, LoaderCircle, LogOut, MoreHorizontal, PanelRightClose, PanelRightOpen, Pencil, Pin, Settings, SquarePen, Trash2 } from './icons'
import { useFloatingPopover } from './hooks/useFloatingPopover'
import { useAppRouting } from './hooks/useAppRouting'
import AppRoutes from './routes/AppRoutes'
import { queryAgent, streamQuery } from './services/query'
import { getChats, createChat, addMessage, generateChatTitle } from './services/chats'
import type { ChatThread } from './types'
import { parseAssistantResponse } from './utils/assistantResponse'
import './App.css'

type ChatRuntimeState = {
  isResponding: boolean
  isGeneratingTitle: boolean
}

function App() {
  const { activeChatId, isChatView, openTemplates, openChat, openNewChat } = useAppRouting()

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [chats, setChats] = useState<ChatThread[]>([])
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [chatRuntime, setChatRuntime] = useState<Record<string, ChatRuntimeState>>({})

  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState(false)
  const [activeChatMenuId, setActiveChatMenuId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const username = 'Avery'
  const activeChat = chats.find((chat) => chat.id === activeChatId) || null

  const profilePopover = useFloatingPopover({
    isOpen: isProfilePopoverOpen,
    onClose: () => setIsProfilePopoverOpen(false),
    placement: isSidebarCollapsed ? 'right-start' : 'top-start',
    panelWidth: 240,
    panelHeight: 200,
  })

  const chatActionsPopover = useFloatingPopover({
    isOpen: Boolean(activeChatMenuId),
    onClose: () => setActiveChatMenuId(null),
    placement: 'right-start',
    panelWidth: 152,
    panelHeight: 176,
  })

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
    const trimmedInput = inputValue.trim()
    if (!trimmedInput) {
      return
    }

    let requestChatId: string | null = activeChatId

    const markRuntime = (chatId: string, patch: Partial<ChatRuntimeState>) => {
      setChatRuntime((prev) => {
        const current = prev[chatId] ?? { isResponding: false, isGeneratingTitle: false }
        return {
          ...prev,
          [chatId]: {
            ...current,
            ...patch,
          },
        }
      })
    }

    try {
      let chatId = activeChatId
      let shouldGenerateTitle = activeChat?.title.trim().toLowerCase() === 'new chat'

      // 1. Create new chat if none is active (temporary placeholder title)
      if (!chatId) {
        const newChat = await createChat({
          title: 'New Chat',
        })
        chatId = newChat.id
        requestChatId = chatId
        shouldGenerateTitle = true
        setChats((prev) => [newChat, ...prev])
        openChat(chatId)
      }

      const pendingAssistantId = crypto.randomUUID()

      // 2. Add user + pending assistant locally for immediate UX
      const userMessage: ChatThread['messages'][0] = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedInput,
        created_at: new Date().toISOString(),
      }

      const pendingAssistantMessage: ChatThread['messages'][0] = {
        id: pendingAssistantId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      }

      markRuntime(chatId, { isResponding: true })

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, userMessage, pendingAssistantMessage],
            }
          }
          return chat
        })
      )
      setInputValue('')

      // 3. Persist user message
      await addMessage(chatId, userMessage)

      // 4. Stream LLM response and update pending assistant in real-time.
      // Fallback to non-stream endpoint if streaming transport fails.
      let streamedContent = ''
      try {
        for await (const chunk of streamQuery({ question: trimmedInput })) {
          streamedContent += chunk
          const nextContent = streamedContent

          setChats((prevChats) =>
            prevChats.map((chat) => {
              if (chat.id !== chatId) {
                return chat
              }

              return {
                ...chat,
                messages: chat.messages.map((message) =>
                  message.id === pendingAssistantId
                    ? {
                        ...message,
                        content: nextContent,
                      }
                    : message
                ),
              }
            })
          )
        }
      } catch (streamError) {
        console.warn('Stream failed, falling back to non-stream query:', streamError)
        const fallback = await queryAgent({ question: trimmedInput })
        streamedContent = fallback.answer?.trim() || streamedContent
      }

      const parsedAssistant = parseAssistantResponse(streamedContent)
      const finalAssistantContent = parsedAssistant.content || "I'm sorry, I couldn't generate a response."
      const assistantMessage: ChatThread['messages'][0] = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: finalAssistantContent,
        sources: parsedAssistant.sources,
        created_at: new Date().toISOString(),
      }

      // 5. Replace pending assistant with finalized assistant message
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === chatId) {
            const nextMessages = chat.messages.map((message) =>
              message.id === pendingAssistantId ? assistantMessage : message
            )

            return {
              ...chat,
              messages: nextMessages,
            }
          }

          return chat
        })
      )

      // 6. Persist assistant message
      await addMessage(chatId, assistantMessage)
      markRuntime(chatId, { isResponding: false })

      // 7. Generate and persist final title for placeholder chats
      if (shouldGenerateTitle) {
        markRuntime(chatId, { isGeneratingTitle: true })
        try {
          const updatedChat = await generateChatTitle(chatId)
          setChats((prevChats) =>
            prevChats.map((chat) => (chat.id === chatId ? updatedChat : chat))
          )
        } catch (titleError) {
          console.error('Failed to generate title:', titleError)
        } finally {
          markRuntime(chatId, { isGeneratingTitle: false })
        }
      }

    } catch (error) {
      console.error('Failed to send message:', error)

      if (requestChatId) {
        markRuntime(requestChatId, { isResponding: false, isGeneratingTitle: false })
      }

      const errorAssistantMessage: ChatThread['messages'][0] = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I hit an error while generating a response. Please try again.',
        created_at: new Date().toISOString(),
      }

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (!requestChatId || chat.id !== requestChatId) {
            return chat
          }

          const messagesWithoutPending = chat.messages.filter(
            (message) => !(message.role === 'assistant' && message.content.trim() === '')
          )

          return {
            ...chat,
            messages: [...messagesWithoutPending, errorAssistantMessage],
          }
        })
      )
    }
  }

  const handleUpdateUserMessage = (messageId: string, content: string) => {
    if (!activeChatId) {
      return
    }

    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id !== activeChatId) {
          return chat
        }

        return {
          ...chat,
          messages: chat.messages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  content,
                }
              : message
          ),
        }
      })
    )
  }

  const handleRegenerateAssistantMessage = (assistantMessageId: string) => {
    if (!activeChat) {
      return
    }

    const assistantIndex = activeChat.messages.findIndex((message) => message.id === assistantMessageId)
    if (assistantIndex === -1) {
      return
    }

    const previousUserMessage = [...activeChat.messages.slice(0, assistantIndex)]
      .reverse()
      .find((message) => message.role === 'user')

    if (!previousUserMessage) {
      return
    }

    setInputValue(previousUserMessage.content)
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
  }

  const handleOpenTemplates = () => {
    openTemplates()
    setActiveChatMenuId(null)
  }

  const handleOpenChat = (chatId?: string) => {
    openChat(chatId)
    setActiveChatMenuId(null)
  }

  const handleNewChat = () => {
    openNewChat()
    setInputValue('')
    setActiveChatMenuId(null)
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
            <div
              key={chat.id}
              className={chat.id === activeChatId ? 'sidebar-chat-row is-active' : 'sidebar-chat-row'}
              role="button"
              tabIndex={0}
              onClick={() => handleOpenChat(chat.id)}
              title={chat.title}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpenChat(chat.id) }}
            >
              <span className="sidebar-item-title-wrap">
                {chatRuntime[chat.id]?.isGeneratingTitle && <LoaderCircle size={12} className="sidebar-title-loader spin" />}
                <span className="sidebar-item-title">{chat.title}</span>
              </span>
              <button
                className="sidebar-chat-menu-btn"
                type="button"
                title="Chat actions"
                aria-label="Chat actions"
                onClick={(e) => {
                  e.stopPropagation()
                  if (activeChatMenuId === chat.id) {
                    setActiveChatMenuId(null)
                    return
                  }
                  setActiveChatMenuId(chat.id)
                  chatActionsPopover.openFromElement(e.currentTarget)
                }}
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
          ))}

          {activeChatMenuId && (
            <div
              ref={chatActionsPopover.popoverRef}
              className="floating-popover chat-actions-popover"
              style={chatActionsPopover.floatingStyle}
            >
              <button className="chat-actions-item" type="button" onClick={() => setActiveChatMenuId(null)}>
                <Pencil size={16} />
                <span>Rename</span>
              </button>
              <button className="chat-actions-item" type="button" onClick={() => setActiveChatMenuId(null)}>
                <Pin size={16} />
                <span>Pin</span>
              </button>
              <button className="chat-actions-item" type="button" onClick={() => setActiveChatMenuId(null)}>
                <Archive size={16} />
                <span>Archive</span>
              </button>
              <button className="chat-actions-item danger" type="button" onClick={() => setActiveChatMenuId(null)}>
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="profile-wrapper">
            <button
              className="profile-button" 
              type="button"
              onClick={(e) => {
                if (isProfilePopoverOpen) {
                  setIsProfilePopoverOpen(false)
                  return
                }
                profilePopover.openFromElement(e.currentTarget)
                setIsProfilePopoverOpen(true)
              }}
            >
              <span className="profile-avatar">U</span>
              {!isSidebarCollapsed && <span className="profile-name">User Profile</span>}
            </button>
            {isProfilePopoverOpen && (
              <div 
                ref={profilePopover.popoverRef}
                className="floating-popover profile-popover" 
                style={profilePopover.floatingStyle}
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

      <main className={isChatView && (!activeChat || (activeChat && activeChat.messages.length === 0)) ? 'main-panel is-empty' : 'main-panel'}>
        {!isChatView && (
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
              <div className="header-title">Templates</div>
            </div>
            <div className="header-right"></div>
          </header>
        )}

        <AppRoutes
          activeChat={activeChat}
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSend={handleSend}
          onUpdateUserMessage={handleUpdateUserMessage}
          onRegenerateAssistantMessage={handleRegenerateAssistantMessage}
          textareaRef={textareaRef}
          username={username}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        />
      </main>
    </div>
  )
}

export default App
