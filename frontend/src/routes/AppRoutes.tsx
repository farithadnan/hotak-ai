import { Navigate, Route, Routes } from 'react-router-dom'
import ChatPage from '../components/page/ChatPage/ChatPage'
import TemplateList from '../components/page/TemplateList/TemplateList'
import type { ChatThread } from '../types'

type AppRoutesProps = {
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

function AppRoutes({
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
}: AppRoutesProps) {
  const chatPageProps = {
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
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="/chat" element={<ChatPage {...chatPageProps} />} />
      <Route path="/chat/:chatId" element={<ChatPage {...chatPageProps} />} />
      <Route path="/templates" element={<TemplateList />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}

export default AppRoutes