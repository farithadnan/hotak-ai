import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, PanelRightClose, Search } from '../../../icons'
import ChatWindow from '../ChatWindow/ChatWindow'
import type { ChatThread, Model } from '../../../types'
import type { MessageAttachment } from '../../../types/models'
import { useClickOutside } from '../../../hooks/useClickOutside'
import { DEFAULT_CHAT_MODEL_ID } from '../../../constants/chat'
import { getAvailableModels } from '../../../services/models'

interface ChatPageProps {
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
  availableTemplates: Array<{
    id: string
    name: string
    sourceCount: number
  }>
  isAttachingSources: boolean
  attachmentFeedback: {
    title?: string
    message: string
    type: 'success' | 'error' | 'info'
  } | null
  onAttachFiles: (files: File[]) => void
  onAttachTemplate: (templateId: string) => void
  onRemovePendingAttachment: (attachmentId: string) => void
  onClearAttachmentFeedback: () => void
  username: string
  onToggleSidebar: () => void
}

function ChatPage({
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
  availableTemplates,
  isAttachingSources,
  attachmentFeedback,
  onAttachFiles,
  onAttachTemplate,
  onRemovePendingAttachment,
  onClearAttachmentFeedback,
  username,
  onToggleSidebar,
}: ChatPageProps) {
  const defaultModelId = DEFAULT_CHAT_MODEL_ID
  const [model, setModel] = useState(DEFAULT_CHAT_MODEL_ID)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isModelPopoverOpen, setIsModelPopoverOpen] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const modelPopoverRef = useRef<HTMLDivElement>(null)

  const [availableModels, setAvailableModels] = useState<Model[]>([
    { id: DEFAULT_CHAT_MODEL_ID, name: 'Gpt 4o Mini', category: 'OpenAI' },
  ])

  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoadingModels(true)
        const models = await getAvailableModels()
        if (models.length > 0) {
          setAvailableModels(models)
          setModel((current) => (models.some((item) => item.id === current) ? current : models[0].id))
        }
      } catch (error) {
        console.error('Failed to load models:', error)
      } finally {
        setIsLoadingModels(false)
      }
    }

    void loadModels()
  }, [])

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

  const formatModelName = (modelId: string) =>
    modelId
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())

  const persistedChatModelId = activeChat?.model || defaultModelId
  const persistedChatModelLabel =
    availableModels.find((m) => m.id === persistedChatModelId)?.name || formatModelName(persistedChatModelId)

  useEffect(() => {
    if (!activeChat) {
      return
    }

    const desiredModel = activeChat.model && availableModels.some((m) => m.id === activeChat.model)
      ? activeChat.model
      : defaultModelId

    if (desiredModel !== model) {
      setModel(desiredModel)
    }
  }, [activeChat?.id, activeChat?.model, availableModels, defaultModelId])

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
    if (activeChat) {
      onChangeActiveChatModel(modelId)
    }
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
                  {isLoadingModels ? (
                    <div className="model-empty">Loading models...</div>
                  ) : filteredModels.length === 0 ? (
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
        isLoadingChats={isLoadingChats}
        hasActiveChatId={hasActiveChatId}
        activeModelLabel={persistedChatModelLabel}
        inputValue={inputValue}
        onInputChange={onInputChange}
        onKeyDown={(e) => onKeyDown(e, model)}
        onSend={() => onSend(model)}
        onUpdateUserMessage={(messageId, content, attachments) => onUpdateUserMessage(messageId, content, attachments, model)}
        onRegenerateAssistantMessage={(messageId) => onRegenerateAssistantMessage(messageId, model)}
        regeneratingAssistantMessageId={regeneratingAssistantMessageId}
        textareaRef={textareaRef}
        pendingAttachments={pendingAttachments}
        availableTemplates={availableTemplates}
        isAttachingSources={isAttachingSources}
        attachmentFeedback={attachmentFeedback}
        onAttachFiles={onAttachFiles}
        onAttachTemplate={onAttachTemplate}
        onRemovePendingAttachment={onRemovePendingAttachment}
        onClearAttachmentFeedback={onClearAttachmentFeedback}
        username={username}
      />
    </>
  )
}

export default ChatPage
