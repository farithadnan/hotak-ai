import { Navigate, Route, Routes } from 'react-router-dom'
import ChatPage from '../components/page/ChatPage/ChatPage'
import TemplateList from '../components/page/TemplateList/TemplateList'
import type { ChatThread } from '../types'
import type { MessageAttachment } from '../types/models'

type AppRoutesProps = {
  activeChat: ChatThread | null
  isLoadingChats: boolean
  hasActiveChatId: boolean
  inputValue: string
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, modelId?: string) => void
  onSend: (modelId?: string) => void
  onChangeActiveChatModel: (modelId: string) => void
  onUpdateUserMessage: (messageId: string, content: string, attachments?: MessageAttachment[], modelId?: string) => void
  onRegenerateAssistantMessage: (messageId: string, modelId?: string) => void
  regeneratingAssistantMessageId: string | null
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  pendingAttachments: Array<{
    id: string
    kind: 'url' | 'file'
    label: string
    status?: 'queued' | 'uploading' | 'ingesting' | 'ready' | 'failed'
    error?: string
  }>
  selectedTemplate: {
    id: string
    name: string
    sourceCount: number
  } | null
  availableTemplates: Array<{
    id: string
    name: string
    sourceCount: number
    sources?: string[]
  }>
  isAttachingSources: boolean
  attachmentFeedback: {
    title?: string
    message: string
    type: 'success' | 'error' | 'info'
  } | null
  onAttachFiles: (files: File[]) => void
  onAttachTemplate: (templateId: string) => void
  onClearPendingTemplate: () => void
  onRemovePendingAttachment: (attachmentId: string) => void
  onClearAttachmentFeedback: () => void
  username: string
  onToggleSidebar: () => void
}

function AppRoutes({
  activeChat,
  isLoadingChats,
  hasActiveChatId,
  inputValue,
  onInputChange,
  onKeyDown,
  onSend,
  onChangeActiveChatModel,
  onUpdateUserMessage,
  onRegenerateAssistantMessage,
  regeneratingAssistantMessageId,
  textareaRef,
  pendingAttachments,
  selectedTemplate,
  availableTemplates,
  isAttachingSources,
  attachmentFeedback,
  onAttachFiles,
  onAttachTemplate,
  onClearPendingTemplate,
  onRemovePendingAttachment,
  onClearAttachmentFeedback,
  username,
  onToggleSidebar,
}: AppRoutesProps) {
  const chatPageProps = {
    activeChat,
    isLoadingChats,
    hasActiveChatId,
    inputValue,
    onInputChange,
    onKeyDown,
    onSend,
    onChangeActiveChatModel,
    onUpdateUserMessage,
    onRegenerateAssistantMessage,
    regeneratingAssistantMessageId,
    textareaRef,
    pendingAttachments,
    selectedTemplate,
    availableTemplates,
    isAttachingSources,
    attachmentFeedback,
    onAttachFiles,
    onAttachTemplate,
    onClearPendingTemplate,
    onRemovePendingAttachment,
    onClearAttachmentFeedback,
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