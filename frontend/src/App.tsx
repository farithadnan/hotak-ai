import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { PanelRightClose } from './icons'
import { useAppRouting } from './hooks/useAppRouting'
import { useChatEngine } from './hooks/useChatEngine'
import { Sidebar } from './components/layout/Sidebar'
import AppRoutes from './routes/AppRoutes'
import { ConfirmDialog } from './components/common/ConfirmDialog/ConfirmDialog'
import { Toastr } from './components/common/Toastr/Toastr'
import type { ToastrType, ToastrPosition } from './components/common/Toastr/Toastr'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './components/page/Auth/LoginPage'
import { UserSettingsModal } from './components/page/UserSettings/UserSettingsModal'
import './App.css'

function AppShell() {
  const { user } = useAuth()
  const { activeChatId, isChatView, openTemplates, openChat, openNewChat } = useAppRouting()

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [toastr, setToastr] = useState({
    open: false,
    message: '',
    title: '',
    type: 'info' as ToastrType,
    position: 'top-right' as ToastrPosition,
  })

  const username = user?.username ?? ''

  const engine = useChatEngine(activeChatId, openChat)

  const showToastr = (options: Partial<typeof toastr>) => {
    setToastr((prev) => ({
      ...prev,
      ...options,
      open: true,
    }))
  }

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev)

  const handleNewChat = () => {
    openNewChat()
    engine.setInputValue('')
  }

  const sidebar = Sidebar({
    chats: engine.chats,
    setChats: engine.setChats,
    isLoadingChats: engine.isLoadingChats,
    chatRuntime: engine.chatRuntime,
    activeChatId,
    isSidebarCollapsed,
    onToggleSidebar: toggleSidebar,
    onOpenChat: openChat,
    onNewChat: handleNewChat,
    onOpenTemplates: openTemplates,
    onOpenSettings: () => setIsSettingsOpen(true),
    onShowToastr: showToastr,
  })

  return (
    <div className="app-shell">
      {sidebar.render}

      <main className={isChatView && (!engine.activeChat || (engine.activeChat && engine.activeChat.messages.length === 0)) ? 'main-panel is-empty' : 'main-panel'}>
        {!isChatView && (
          <header className="main-header">
            <div className="header-left">
              <button
                className="icon-button mobile-toggle"
                type="button"
                onClick={toggleSidebar}
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
          activeChat={engine.activeChat}
          isLoadingChats={engine.isLoadingChats}
          hasActiveChatId={Boolean(activeChatId)}
          inputValue={engine.inputValue}
          onInputChange={engine.handleInputChange}
          onKeyDown={engine.handleKeyDown}
          onSend={engine.handleSend}
          onChangeActiveChatModel={engine.handleChangeActiveChatModel}
          onUpdateUserMessage={engine.handleUpdateUserMessage}
          onRegenerateAssistantMessage={engine.handleRegenerateAssistantMessage}
          regeneratingAssistantMessageId={engine.regeneratingAssistantMessageId}
          textareaRef={engine.textareaRef}
          pendingAttachments={engine.pendingAttachments}
          selectedTemplate={engine.pendingTemplate
            ? {
                id: engine.pendingTemplate.id,
                name: engine.pendingTemplate.name,
                sourceCount: engine.pendingTemplate.source_count ?? engine.pendingTemplate.sources?.length ?? 0,
              }
            : null}
          availableTemplates={engine.availableTemplates.map((template) => ({
            id: template.id,
            name: template.name,
            sourceCount: template.source_count ?? template.sources?.length ?? 0,
            sources: template.sources ?? [],
          }))}
          isAttachingSources={engine.isAttachingSources}
          attachmentFeedback={engine.attachmentFeedback}
          onAttachFiles={engine.handleAttachFiles}
          onAttachTemplate={engine.handleAttachTemplate}
          onClearPendingTemplate={engine.clearPendingTemplate}
          onRemovePendingAttachment={engine.handleRemovePendingAttachment}
          onClearAttachmentFeedback={engine.clearAttachmentFeedback}
          username={username}
          onToggleSidebar={toggleSidebar}
        />
      </main>

      <ConfirmDialog
        open={sidebar.isDeleteConfirmOpen}
        title="Delete Chat"
        message={
          sidebar.pendingDeleteChatId
            ? `Delete "${engine.chats.find((chat) => chat.id === sidebar.pendingDeleteChatId)?.title || 'this chat'}"? This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          void sidebar.handleConfirmDeleteChat()
        }}
        onCancel={sidebar.handleCancelDeleteChat}
      />

      <Toastr
        open={toastr.open}
        title={toastr.title || undefined}
        message={toastr.message}
        type={toastr.type}
        position={toastr.position}
        onClose={() => setToastr((prev) => ({ ...prev, open: false }))}
      />

      <UserSettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<AppShell />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
