import { useState, useRef, useMemo } from 'react'
import { Archive, BookType, LoaderCircle, LogOut, MoreHorizontal, PanelRightClose, PanelRightOpen, Pencil, Pin, Settings, SquarePen, Trash2 } from '../../icons'
import { useFloatingPopover } from '../../hooks/useFloatingPopover'
import { prettifyModelName } from '../../services/models'
import {
  SIDEBAR_CHAT_ACTIONS_POPOVER_HEIGHT,
  SIDEBAR_CHAT_ACTIONS_POPOVER_WIDTH,
  SIDEBAR_PROFILE_POPOVER_HEIGHT,
  SIDEBAR_PROFILE_POPOVER_WIDTH,
} from '../../constants/chat'
import { SidebarChatListSkeleton } from './SidebarChatListSkeleton'
import { ArchivedChatsModal } from '../common/ArchivedChatsModal/ArchivedChatsModal'
import { updateChat, deleteChat } from '../../services/chats'
import type { ChatThread } from '../../types'
import type { ChatRuntimeState } from '../../hooks/useChatEngine'

type SidebarProps = {
  chats: ChatThread[]
  setChats: React.Dispatch<React.SetStateAction<ChatThread[]>>
  isLoadingChats: boolean
  chatRuntime: Record<string, ChatRuntimeState>
  activeChatId: string | null
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  onOpenChat: (chatId?: string) => void
  onNewChat: () => void
  onOpenTemplates: () => void
  onShowToastr: (options: { title?: string; message?: string; type?: 'success' | 'error' | 'info' }) => void
}

export function Sidebar({
  chats,
  setChats,
  isLoadingChats,
  chatRuntime,
  activeChatId,
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenChat,
  onNewChat,
  onOpenTemplates,
  onShowToastr,
}: SidebarProps) {
  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState(false)
  const [activeChatMenuId, setActiveChatMenuId] = useState<string | null>(null)
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null)
  const [renamingValue, setRenamingValue] = useState('')
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState<string | null>(null)
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false)

  const renameCommitLockRef = useRef(false)

  const orderedChats = useMemo(() => {
    const pinned: ChatThread[] = []
    const unpinned: ChatThread[] = []

    chats.forEach((chat) => {
      if (chat.pinned) {
        pinned.push(chat)
      } else {
        unpinned.push(chat)
      }
    })

    return [...pinned, ...unpinned]
  }, [chats])

  const profilePopover = useFloatingPopover({
    isOpen: isProfilePopoverOpen,
    onClose: () => setIsProfilePopoverOpen(false),
    placement: isSidebarCollapsed ? 'right-start' : 'top-start',
    panelWidth: SIDEBAR_PROFILE_POPOVER_WIDTH,
    panelHeight: SIDEBAR_PROFILE_POPOVER_HEIGHT,
  })

  const chatActionsPopover = useFloatingPopover({
    isOpen: Boolean(activeChatMenuId),
    onClose: () => setActiveChatMenuId(null),
    placement: 'right-start',
    panelWidth: SIDEBAR_CHAT_ACTIONS_POPOVER_WIDTH,
    panelHeight: SIDEBAR_CHAT_ACTIONS_POPOVER_HEIGHT,
  })

  const handleOpenChat = (chatId?: string) => {
    onOpenChat(chatId)
    setActiveChatMenuId(null)
  }

  const handleNewChat = () => {
    onNewChat()
    setActiveChatMenuId(null)
  }

  const handleOpenTemplates = () => {
    onOpenTemplates()
    setActiveChatMenuId(null)
  }

  const handleStartRenameChat = (chatId: string) => {
    const chat = chats.find((item) => item.id === chatId)
    if (!chat) {
      return
    }

    setRenamingChatId(chatId)
    setRenamingValue(chat.title)
    setActiveChatMenuId(null)
  }

  const handleSubmitRenameChat = async (chatId: string) => {
    if (renameCommitLockRef.current) {
      return
    }
    renameCommitLockRef.current = true

    const chat = chats.find((item) => item.id === chatId)
    const nextTitle = renamingValue.trim()

    setRenamingChatId(null)
    setRenamingValue('')

    if (!chat || !nextTitle || nextTitle === chat.title) {
      setTimeout(() => {
        renameCommitLockRef.current = false
      }, 0)
      return
    }

    try {
      const updated = await updateChat(chatId, { title: nextTitle })
      setChats((prevChats) => prevChats.map((item) => (item.id === chatId ? updated : item)))
    } catch (error) {
      console.error('Failed to rename chat:', error)
    } finally {
      setTimeout(() => {
        renameCommitLockRef.current = false
      }, 0)
    }
  }

  const handleTogglePinChat = async (chatId: string) => {
    const chat = chats.find((item) => item.id === chatId)
    if (!chat) {
      return
    }

    try {
      const updated = await updateChat(chatId, { pinned: !chat.pinned })
      setChats((prevChats) => prevChats.map((item) => (item.id === chatId ? updated : item)))
    } catch (error) {
      console.error('Failed to toggle pin chat:', error)
    } finally {
      setActiveChatMenuId(null)
    }
  }

  const handleRequestDeleteChat = (chatId: string) => {
    setPendingDeleteChatId(chatId)
    setIsDeleteConfirmOpen(true)
    setActiveChatMenuId(null)
  }

  const handleCancelDeleteChat = () => {
    setIsDeleteConfirmOpen(false)
    setPendingDeleteChatId(null)
  }

  const handleConfirmDeleteChat = async () => {
    const chatId = pendingDeleteChatId
    if (!chatId) {
      return
    }

    setIsDeleteConfirmOpen(false)

    try {
      await deleteChat(chatId)
      setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId))
      onShowToastr({
        title: 'Deleted',
        message: 'Chat deleted successfully.',
        type: 'success',
      })

      if (activeChatId === chatId) {
        onNewChat()
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
      onShowToastr({
        title: 'Delete failed',
        message: 'Failed to delete chat. Please try again.',
        type: 'error',
      })
    } finally {
      setPendingDeleteChatId(null)
    }
  }

  const handleArchiveChat = async (chatId: string) => {
    setActiveChatMenuId(null)
    try {
      await updateChat(chatId, { archived: true })
      setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId))
      onShowToastr({ title: 'Archived', message: 'Chat archived.', type: 'success' })
      if (activeChatId === chatId) {
        onNewChat()
      }
    } catch (error) {
      console.error('Failed to archive chat:', error)
      onShowToastr({ title: 'Archive failed', message: 'Failed to archive chat. Please try again.', type: 'error' })
    }
  }

  const handleOpenArchivedModal = () => {
    setIsProfilePopoverOpen(false)
    setIsArchivedModalOpen(true)
  }

  const handleUnarchiveFromModal = (chat: ChatThread) => {
    setChats((prevChats) => [chat, ...prevChats])
  }

  return {
    isDeleteConfirmOpen,
    pendingDeleteChatId,
    handleCancelDeleteChat,
    handleConfirmDeleteChat,
    render: (
      <>
        {/* Mobile backdrop */}
        {!isSidebarCollapsed && (
          <div className="sidebar-backdrop" onClick={onToggleSidebar} />
        )}

        <aside className={isSidebarCollapsed ? 'sidebar is-collapsed' : 'sidebar'}>
          <div className="sidebar-header">
            <div className="logo-wrap">
              <div className="logo-mark">HA</div>
              {isSidebarCollapsed && (
                <button
                  className="icon-button sidebar-toggle is-replace"
                  type="button"
                  onClick={onToggleSidebar}
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
                onClick={onToggleSidebar}
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
            {isLoadingChats && <SidebarChatListSkeleton />}
            {!isLoadingChats && chats.length === 0 && <div className="model-empty">No chats yet</div>}
            {!isLoadingChats && orderedChats.map((chat) => (
              <div
                key={chat.id}
                className={chat.id === activeChatId ? 'sidebar-chat-row is-active' : 'sidebar-chat-row'}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (renamingChatId === chat.id) {
                    return
                  }
                  handleOpenChat(chat.id)
                }}
                title={chat.title}
                onKeyDown={(e) => {
                  if (renamingChatId === chat.id) {
                    return
                  }
                  if (e.key === 'Enter' || e.key === ' ') handleOpenChat(chat.id)
                }}
              >
                <span className="sidebar-item-title-wrap">
                  <span className="sidebar-item-title-row">
                    {chatRuntime[chat.id]?.isGeneratingTitle && <LoaderCircle size={12} className="sidebar-title-loader spin" />}
                    {renamingChatId === chat.id ? (
                      <input
                        className="sidebar-chat-title-input"
                        value={renamingValue}
                        onChange={(e) => setRenamingValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => {
                          void handleSubmitRenameChat(chat.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void handleSubmitRenameChat(chat.id)
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            setRenamingChatId(null)
                            setRenamingValue('')
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="sidebar-item-title">{chat.title}</span>
                    )}
                  </span>
                  {chat.model && renamingChatId !== chat.id && (
                    <span className="sidebar-chat-model">{prettifyModelName(chat.model)}</span>
                  )}
                </span>
                {chat.pinned && <Pin size={12} className="sidebar-chat-pin-indicator" />}
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
                <button className="chat-actions-item" type="button" onClick={() => handleStartRenameChat(activeChatMenuId)}>
                  <Pencil size={16} />
                  <span>Rename</span>
                </button>
                <button className="chat-actions-item" type="button" onClick={() => void handleTogglePinChat(activeChatMenuId)}>
                  <Pin size={16} />
                  <span>{chats.find((chat) => chat.id === activeChatMenuId)?.pinned ? 'Unpin' : 'Pin'}</span>
                </button>
                <button className="chat-actions-item" type="button" onClick={() => void handleArchiveChat(activeChatMenuId)}>
                  <Archive size={16} />
                  <span>Archive</span>
                </button>
                <button className="chat-actions-item danger" type="button" onClick={() => handleRequestDeleteChat(activeChatMenuId)}>
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
                  <button className="profile-menu-item" type="button" onClick={handleOpenArchivedModal}>
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

        <ArchivedChatsModal
          open={isArchivedModalOpen}
          onClose={() => setIsArchivedModalOpen(false)}
          onUnarchive={handleUnarchiveFromModal}
          onShowToastr={onShowToastr}
        />
      </>
    ),
  }
}
