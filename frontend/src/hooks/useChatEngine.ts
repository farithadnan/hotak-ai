import { useState, useRef, useEffect } from 'react'
import { queryAgent, streamQuery } from '../services/query'
import { getChats, createChat, addMessage, generateChatTitle, updateChat } from '../services/chats'
import { loadDocuments, uploadDocuments } from '../services/documents'
import { getTemplates } from '../services/templates'
import { ALLOWED_ATTACHMENT_FILE_EXTENSIONS, MAX_ATTACHMENT_FILE_SIZE_BYTES } from '../constants/attachments'
import { CHAT_TEXTAREA_MAX_SCROLL_HEIGHT } from '../constants/chat'
import type { ChatThread } from '../types'
import { parseAssistantResponse } from '../utils/assistantResponse'
import type { MessageAttachment, Template } from '../types/models'

export type ChatRuntimeState = {
  isResponding: boolean
  isGeneratingTitle: boolean
}

type LlmContextMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const STREAM_MODEL_FALLBACK_PATTERN = /\[\[MODEL_FALLBACK:([^\]]+)\]\]\n?/g

type PendingAttachment = {
  id: string
  kind: 'url' | 'file'
  label: string
  source: string
  file?: File
  status: 'queued' | 'uploading' | 'ingesting' | 'ready' | 'failed'
  error?: string
}

type AttachmentFeedback = {
  title?: string
  message: string
  type: 'success' | 'error' | 'info'
} | null

const URL_PATTERN = /https?:\/\/[^\s<>")]+/gi

export function useChatEngine(
  activeChatId: string | null,
  openChat: (chatId?: string) => void,
) {
  const [inputValue, setInputValue] = useState('')
  const [chats, setChats] = useState<ChatThread[]>([])
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [chatRuntime, setChatRuntime] = useState<Record<string, ChatRuntimeState>>({})
  const [regeneratingAssistantMessageId, setRegeneratingAssistantMessageId] = useState<string | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null)
  const [isAttachingSources, setIsAttachingSources] = useState(false)
  const [attachmentFeedback, setAttachmentFeedback] = useState<AttachmentFeedback>(null)
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([])

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const inferAttachmentKind = (source: string): 'url' | 'file' => (
    /^https?:\/\//i.test(source) ? 'url' : 'file'
  )

  const normalizeUrl = (value: string): string | null => {
    try {
      const parsed = new URL(value.trim())
      if (!/^https?:$/i.test(parsed.protocol)) {
        return null
      }
      parsed.hash = ''
      return parsed.toString().replace(/\/+$/, '')
    } catch {
      return null
    }
  }

  const extractUrlsFromText = (value: string): string[] => {
    const candidates = value.match(URL_PATTERN) ?? []
    const unique = new Set<string>()
    for (const raw of candidates) {
      const normalized = normalizeUrl(raw)
      if (!normalized) {
        continue
      }
      unique.add(normalized)
    }
    return Array.from(unique)
  }

  const buildLlmContext = (messages: ChatThread['messages']): LlmContextMessage[] =>
    messages
      .filter((message) => message.content.trim().length > 0)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }))

  // Reset attachments and input when switching chats
  useEffect(() => {
    clearPendingAttachments()
    setInputValue('')
  }, [activeChatId])

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

  useEffect(() => {
    const loadTemplateCatalog = async () => {
      try {
        const templates = await getTemplates()
        setAvailableTemplates(templates)
      } catch (error) {
        console.error('Failed to load templates for attachment picker:', error)
      }
    }
    void loadTemplateCatalog()
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      textareaRef.current.style.overflowY = textareaRef.current.scrollHeight > CHAT_TEXTAREA_MAX_SCROLL_HEIGHT ? 'auto' : 'hidden'
    }
  }, [inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }

  const clearAttachmentFeedback = () => {
    setAttachmentFeedback(null)
  }

  const showAttachmentFeedback = (feedback: AttachmentFeedback) => {
    setAttachmentFeedback(feedback)
  }

  const updatePendingAttachment = (attachmentId: string, patch: Partial<PendingAttachment>) => {
    setPendingAttachments((prev) =>
      prev.map((attachment) =>
        attachment.id === attachmentId
          ? { ...attachment, ...patch }
          : attachment
      )
    )
  }

  const handleAttachFiles = (files: File[]) => {
    if (files.length === 0) {
      return
    }

    setPendingAttachments((prev) => {
      const dedupeKeys = new Set(prev.filter((item) => item.kind === 'file').map((item) => item.source))
      const additions: PendingAttachment[] = []
      const validationErrors: string[] = []

      for (const file of files) {
        const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
        if (!ALLOWED_ATTACHMENT_FILE_EXTENSIONS.includes(extension as (typeof ALLOWED_ATTACHMENT_FILE_EXTENSIONS)[number])) {
          validationErrors.push(`${file.name}: unsupported file type ${extension || '(none)'}`)
          continue
        }
        if (file.size > MAX_ATTACHMENT_FILE_SIZE_BYTES) {
          validationErrors.push(`${file.name}: exceeds ${formatFileSize(MAX_ATTACHMENT_FILE_SIZE_BYTES)}`)
          continue
        }

        const sourceKey = `${file.name}:${file.size}:${file.lastModified}`
        if (dedupeKeys.has(sourceKey)) {
          continue
        }
        dedupeKeys.add(sourceKey)
        additions.push({
          id: crypto.randomUUID(),
          kind: 'file',
          label: file.name,
          source: sourceKey,
          file,
          status: 'queued',
        })
      }

      if (additions.length === 0) {
          if (validationErrors.length > 0) {
            showAttachmentFeedback({
              title: 'File validation failed',
              message: validationErrors.slice(0, 2).join(' | '),
              type: 'error',
            })
          }
      } else if (validationErrors.length > 0) {
        showAttachmentFeedback({
          title: 'Some files were skipped',
          message: validationErrors.slice(0, 2).join(' | '),
          type: 'error',
        })
      }

      return [...prev, ...additions]
    })
  }

  const handleAttachTemplate = (templateId: string) => {
    const template = availableTemplates.find((item) => item.id === templateId)
    if (!template) {
      showAttachmentFeedback({
        title: 'Template not found',
        message: 'The selected template could not be loaded.',
        type: 'error',
      })
      return
    }

    setPendingTemplateId(template.id)
  }

  const handleRemovePendingAttachment = (attachmentId: string) => {
    setPendingAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId))
  }

  const clearPendingAttachments = () => {
    setPendingAttachments([])
    setPendingTemplateId(null)
  }

  const clearPendingTemplate = () => {
    setPendingTemplateId(null)
  }

  const ingestPendingAttachments = async (extraUrlSources: string[] = []): Promise<MessageAttachment[]> => {
    const normalizedExtraUrls = extraUrlSources
      .map((value) => normalizeUrl(value))
      .filter((value): value is string => Boolean(value))

    const existingSources = new Set(pendingAttachments.map((item) => item.source))
    const syntheticUrlAttachments: PendingAttachment[] = normalizedExtraUrls
      .filter((source) => !existingSources.has(source))
      .map((source) => ({
        id: crypto.randomUUID(),
        kind: 'url',
        label: source,
        source,
        status: 'queued',
      }))

    const allAttachments = [...pendingAttachments, ...syntheticUrlAttachments]
    if (allAttachments.length === 0) {
      return []
    }

    const urlAttachments = allAttachments.filter((item) => item.kind === 'url')
    const fileAttachments = allAttachments.filter((item) => item.kind === 'file' && item.file)
    const persistedAttachmentIds = new Set(pendingAttachments.map((item) => item.id))

    const resolved: MessageAttachment[] = []

    setIsAttachingSources(true)
    try {
      if (urlAttachments.length > 0) {
        for (const item of urlAttachments) {
          if (persistedAttachmentIds.has(item.id)) {
            updatePendingAttachment(item.id, { status: 'ingesting', error: undefined })
          }
        }

        try {
          const urlResult = await loadDocuments({
            sources: urlAttachments.map((item) => item.source),
          })

          const readySources = new Set([
            ...urlResult.loaded_sources,
            ...urlResult.cached_sources,
          ])

          for (const item of urlAttachments) {
            const isReady = readySources.has(item.source)
            const status: MessageAttachment['status'] = isReady ? 'ingested' : 'failed'
            const error = isReady ? undefined : 'Failed to load URL'

            if (persistedAttachmentIds.has(item.id)) {
              updatePendingAttachment(item.id, {
                status: isReady ? 'ready' : 'failed',
                error,
              })
            }

            resolved.push({
              id: item.id,
              kind: 'url',
              label: item.label,
              source: item.source,
              status,
              error,
            })
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load URL'

          for (const item of urlAttachments) {
            if (persistedAttachmentIds.has(item.id)) {
              updatePendingAttachment(item.id, { status: 'failed', error: message })
            }

            resolved.push({
              id: item.id,
              kind: 'url',
              label: item.label,
              source: item.source,
              status: 'failed',
              error: message,
            })
          }
        }
      }

      if (fileAttachments.length > 0) {
        for (const item of fileAttachments) {
          updatePendingAttachment(item.id, { status: 'uploading', error: undefined })
          try {
            const uploadResult = await uploadDocuments([item.file as File])
            const result = uploadResult.file_results[0]
            const isIngested = result?.status === 'ingested' || result?.status === 'cached'
            const status: MessageAttachment['status'] = isIngested ? 'ingested' : 'failed'
            const error = isIngested ? undefined : (result?.error || 'Failed to process file')

            updatePendingAttachment(item.id, {
              status: isIngested ? 'ready' : 'failed',
              error,
            })

            resolved.push({
              id: item.id,
              kind: 'file',
              label: item.label,
              source: result?.source || item.label,
              status,
              error,
            })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to upload file'
            updatePendingAttachment(item.id, { status: 'failed', error: message })
            resolved.push({
              id: item.id,
              kind: 'file',
              label: item.label,
              source: item.label,
              status: 'failed',
              error: message,
            })
          }
        }
      }
    } finally {
      setIsAttachingSources(false)
    }

    return resolved
  }

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

  const ensureChatModel = async (chatId: string, modelId?: string) => {
    const nextModel = modelId?.trim()
    if (!nextModel) {
      return
    }

    const chat = chats.find((item) => item.id === chatId)
    if (!chat || chat.model === nextModel) {
      return
    }

    setChats((prevChats) =>
      prevChats.map((item) => (item.id === chatId ? { ...item, model: nextModel } : item))
    )

    try {
      const updated = await updateChat(chatId, { model: nextModel })
      setChats((prevChats) => prevChats.map((item) => (item.id === chatId ? updated : item)))
    } catch (error) {
      console.error('Failed to persist chat model:', error)
    }
  }

  const ensureChatTemplate = async (chatId: string, templateId?: string | null) => {
    const nextTemplateId = templateId?.trim() || null

    const chat = chats.find((item) => item.id === chatId)
    if (!chat || (chat.template_id || null) === nextTemplateId) {
      return
    }

    setChats((prevChats) =>
      prevChats.map((item) => (item.id === chatId ? { ...item, template_id: nextTemplateId } : item))
    )

    try {
      const updated = await updateChat(chatId, { template_id: nextTemplateId ?? undefined })
      setChats((prevChats) => prevChats.map((item) => (item.id === chatId ? updated : item)))
    } catch (error) {
      console.error('Failed to persist chat template:', error)
    }
  }

  const streamAssistantText = async (
    question: string,
    onPartial: (partialText: string) => void,
    chatId?: string,
    modelId?: string,
    templateId?: string,
    onModelResolved?: (resolvedModelId: string) => void,
    contextMessages?: LlmContextMessage[],
  ) => {
    let streamedContent = ''
    let reportedModel: string | undefined
    const effectiveRequestedModel = modelId?.trim() || (chatId
      ? chats.find((chat) => chat.id === chatId)?.model?.trim()
      : undefined)

    const parseStreamContent = (raw: string) => {
      let fallbackModel: string | undefined
      const cleaned = raw.replace(STREAM_MODEL_FALLBACK_PATTERN, (_match, modelFromStream) => {
        fallbackModel = String(modelFromStream).trim()
        return ''
      })
      return { cleaned, fallbackModel }
    }

    try {
      for await (const chunk of streamQuery({
        question,
        chat_id: chatId,
        model: modelId,
        template_id: templateId,
        messages: contextMessages,
      })) {
        streamedContent += chunk
        const parsed = parseStreamContent(streamedContent)
        if (parsed.fallbackModel && parsed.fallbackModel !== reportedModel) {
          reportedModel = parsed.fallbackModel
          onModelResolved?.(parsed.fallbackModel)
        }
        onPartial(parsed.cleaned)
      }
    } catch (streamError) {
      console.warn('Stream failed, falling back to non-stream query:', streamError)
      const fallback = await queryAgent({
        question,
        chat_id: chatId,
        model: modelId,
        template_id: templateId,
        messages: contextMessages,
      })
      streamedContent = fallback.answer?.trim() || streamedContent
      if (fallback.model && fallback.model !== reportedModel) {
        reportedModel = fallback.model
        onModelResolved?.(fallback.model)
      }
      onPartial(streamedContent)
    }

    const parsed = parseStreamContent(streamedContent)
    return {
      content: parsed.cleaned,
      model: reportedModel || effectiveRequestedModel,
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, modelId?: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(modelId)
    }
  }

  const handleSend = async (modelId?: string) => {
    const trimmedInput = inputValue.trim()
    if (!trimmedInput) {
      return
    }

    let requestChatId: string | null = activeChatId
    const templateIdForSend = pendingTemplateId ?? activeChat?.template_id ?? null

    try {
      let chatId = activeChatId
      let shouldGenerateTitle = activeChat?.title.trim().toLowerCase() === 'new chat'

      // 1. Create new chat if none is active
      if (!chatId) {
        const newChat = await createChat({
          title: 'New Chat',
          model: modelId,
          template_id: templateIdForSend ?? undefined,
        })
        chatId = newChat.id
        requestChatId = chatId
        shouldGenerateTitle = true
        setChats((prev) => [newChat, ...prev])
        openChat(chatId)
      }

      if (chatId) {
        await ensureChatModel(chatId, modelId)
        await ensureChatTemplate(chatId, templateIdForSend)
      }

      const urlSourcesFromPrompt = extractUrlsFromText(trimmedInput)
      const messageAttachments = await ingestPendingAttachments(urlSourcesFromPrompt)

      const pendingAssistantId = crypto.randomUUID()

      // 2. Add user + pending assistant locally for immediate UX
      const userMessage: ChatThread['messages'][0] = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedInput,
        attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
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
      clearPendingAttachments()

      const currentChatMessages = chats.find((chat) => chat.id === chatId)?.messages ?? []
      const requestContextMessages: LlmContextMessage[] = [
        ...buildLlmContext(currentChatMessages),
        { role: 'user', content: trimmedInput },
      ]

      // 4. Stream LLM response and update pending assistant in real-time
      const { content: streamedContent, model: finalModel } = await streamAssistantText(
        trimmedInput,
        (partialText) => {
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
                        content: partialText,
                      }
                    : message
                ),
              }
            })
          )
        },
        chatId,
        modelId,
        templateIdForSend ?? undefined,
        (resolvedModelId) => {
          if (chatId) {
            void ensureChatModel(chatId, resolvedModelId)
          }
        },
        requestContextMessages,
      )

      const parsedAssistant = parseAssistantResponse(streamedContent)
      const finalAssistantContent = parsedAssistant.content || "I'm sorry, I couldn't generate a response."
      const assistantMessage: ChatThread['messages'][0] = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: finalAssistantContent,
        model: finalModel,
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

  const handleUpdateUserMessage = (
    messageId: string,
    content: string,
    attachments?: MessageAttachment[],
    modelId?: string,
  ) => {
    if (!activeChatId || !activeChat) {
      return
    }

    const trimmedContent = content.trim()
    if (!trimmedContent) {
      return
    }

    void (async () => {
      const userIndex = activeChat.messages.findIndex((message) => message.id === messageId)
      if (userIndex === -1) {
        return
      }

      let assistantTarget = activeChat.messages.find(
        (message, idx) => idx > userIndex && message.role === 'assistant'
      )

      const baseExistingAttachments = activeChat.messages[userIndex]?.attachments ?? []
      const attachmentOverrides = attachments ?? baseExistingAttachments

      await ensureChatModel(activeChatId, modelId)

      const pendingAssistantId = assistantTarget?.id ?? crypto.randomUUID()
      const pendingAssistantCreatedAt = assistantTarget?.created_at ?? new Date().toISOString()

      const urlSourcesFromEdit = extractUrlsFromText(trimmedContent)
      const knownAttachmentSources = new Set(attachmentOverrides.map((item) => item.source))
      const urlsToIngest = urlSourcesFromEdit.filter((source) => !knownAttachmentSources.has(source))

      const explicitUrlAttachmentSources = attachmentOverrides
        .filter((item) => item.kind === 'url' && item.status !== 'ingested')
        .map((item) => normalizeUrl(item.source) ?? item.source)

      const allUrlSourcesToIngest = Array.from(new Set([...urlsToIngest, ...explicitUrlAttachmentSources]))
      const attachmentUrlBySource = new Map(
        attachmentOverrides
          .filter((item) => item.kind === 'url')
          .map((item) => [item.source, item])
      )

      const resolvedAutoUrlAttachments: MessageAttachment[] = []
      if (allUrlSourcesToIngest.length > 0) {
        try {
          const urlResult = await loadDocuments({ sources: allUrlSourcesToIngest })
          const readySources = new Set([...urlResult.loaded_sources, ...urlResult.cached_sources])
          for (const source of allUrlSourcesToIngest) {
            const isReady = readySources.has(source)
            const existing = attachmentUrlBySource.get(source)
            resolvedAutoUrlAttachments.push({
              id: existing?.id ?? crypto.randomUUID(),
              kind: 'url',
              label: existing?.label || source,
              source,
              status: isReady ? 'ingested' : 'failed',
              error: isReady ? undefined : 'Failed to load URL',
            })
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load URL'
          for (const source of allUrlSourcesToIngest) {
            const existing = attachmentUrlBySource.get(source)
            resolvedAutoUrlAttachments.push({
              id: existing?.id ?? crypto.randomUUID(),
              kind: 'url',
              label: existing?.label || source,
              source,
              status: 'failed',
              error: message,
            })
          }
        }
      }

      const mergedAttachmentsMap = new Map<string, MessageAttachment>()
      for (const item of attachmentOverrides) {
        mergedAttachmentsMap.set(item.source, item)
      }
      for (const item of resolvedAutoUrlAttachments) {
        mergedAttachmentsMap.set(item.source, item)
      }
      const mergedAttachments = Array.from(mergedAttachmentsMap.values())

      const baseMessages = activeChat.messages
        .filter((message, idx) => idx <= userIndex || message.id === pendingAssistantId)
        .map((message) => {
          if (message.id === messageId) {
            return {
              ...message,
              content: trimmedContent,
              attachments: mergedAttachments.length > 0 ? mergedAttachments : undefined,
            }
          }

          if (message.id === pendingAssistantId) {
            return {
              ...message,
              content: '',
              sources: undefined,
            }
          }

          return message
        })

      if (!assistantTarget) {
        baseMessages.push({
          id: pendingAssistantId,
          role: 'assistant',
          content: '',
          created_at: pendingAssistantCreatedAt,
        })
      }

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                messages: baseMessages,
              }
            : chat
        )
      )

      markRuntime(activeChatId, { isResponding: true })

      try {
        const { content: streamedContent, model: finalModel } = await streamAssistantText(
          trimmedContent,
          (partialText) => {
            setChats((prevChats) =>
              prevChats.map((chat) => {
                if (chat.id !== activeChatId) {
                  return chat
                }

                return {
                  ...chat,
                  messages: chat.messages.map((message) =>
                    message.id === pendingAssistantId
                      ? {
                          ...message,
                          content: partialText,
                        }
                      : message
                  ),
                }
              })
            )
          },
          activeChatId,
          modelId,
          undefined,
          (resolvedModelId) => {
            void ensureChatModel(activeChatId, resolvedModelId)
          },
          buildLlmContext(baseMessages),
        )

        const parsedAssistant = parseAssistantResponse(streamedContent)
        const finalAssistantContent = parsedAssistant.content || "I'm sorry, I couldn't generate a response."

        const finalMessages = baseMessages.map((message) =>
          message.id === pendingAssistantId
            ? {
                ...message,
                content: finalAssistantContent,
                model: finalModel,
                sources: parsedAssistant.sources,
              }
            : message
        )

        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === activeChatId
              ? {
                  ...chat,
                  messages: finalMessages,
                }
              : chat
          )
        )

        await updateChat(activeChatId, { messages: finalMessages })
      } catch (error) {
        console.error('Failed to regenerate after edit:', error)
      } finally {
        markRuntime(activeChatId, { isResponding: false })
      }
    })()
  }

  const handleRegenerateAssistantMessage = (assistantMessageId: string, modelId?: string) => {
    if (!activeChat || !activeChatId) {
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

    const baseMessages = activeChat.messages.map((message) =>
      message.id === assistantMessageId
        ? {
            ...message,
            content: '',
            sources: undefined,
          }
        : message
    )

    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              messages: baseMessages,
            }
          : chat
      )
    )

    markRuntime(activeChatId, { isResponding: true })
    setRegeneratingAssistantMessageId(assistantMessageId)

    void (async () => {
      try {
        await ensureChatModel(activeChatId, modelId)

        const regeneratePrompt = [
          previousUserMessage.content,
          '',
          'Please provide an alternative answer with different wording and structure from your previous response while keeping the same meaning.',
        ].join('\n')

        const { content: streamedContent, model: finalModel } = await streamAssistantText(
          regeneratePrompt,
          (partialText) => {
            setChats((prevChats) =>
              prevChats.map((chat) => {
                if (chat.id !== activeChatId) {
                  return chat
                }

                return {
                  ...chat,
                  messages: chat.messages.map((message) =>
                    message.id === assistantMessageId
                      ? {
                          ...message,
                          content: partialText,
                        }
                      : message
                  ),
                }
              })
            )
          },
          activeChatId,
          modelId,
          undefined,
          (resolvedModelId) => {
            void ensureChatModel(activeChatId, resolvedModelId)
          },
          buildLlmContext(baseMessages),
        )

        const parsedAssistant = parseAssistantResponse(streamedContent)
        const finalAssistantContent = parsedAssistant.content || "I'm sorry, I couldn't generate a response."

        const finalMessages = baseMessages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: finalAssistantContent,
                model: finalModel,
                sources: parsedAssistant.sources,
              }
            : message
        )

        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === activeChatId
              ? {
                  ...chat,
                  messages: finalMessages,
                }
              : chat
          )
        )

        await updateChat(activeChatId, { messages: finalMessages })
      } catch (error) {
        console.error('Failed to regenerate assistant message:', error)
      } finally {
        markRuntime(activeChatId, { isResponding: false })
        setRegeneratingAssistantMessageId(null)
      }
    })()
  }

  const handleChangeActiveChatModel = (modelId: string) => {
    if (!activeChatId) {
      return
    }

    const nextModel = modelId.trim()
    if (!nextModel) {
      return
    }

    const currentChat = chats.find((chat) => chat.id === activeChatId)
    if (currentChat?.model === nextModel) {
      return
    }

    setChats((prevChats) =>
      prevChats.map((chat) => (chat.id === activeChatId ? { ...chat, model: nextModel } : chat))
    )

    void (async () => {
      try {
        const updated = await updateChat(activeChatId, { model: nextModel })
        setChats((prevChats) => prevChats.map((chat) => (chat.id === activeChatId ? updated : chat)))
      } catch (error) {
        console.error('Failed to update active chat model:', error)
      }
    })()
  }

  const pendingTemplate = pendingTemplateId
    ? availableTemplates.find((template) => template.id === pendingTemplateId) ?? null
    : null

  return {
    // State
    chats,
    setChats,
    isLoadingChats,
    chatRuntime,
    inputValue,
    activeChat,
    regeneratingAssistantMessageId,
    textareaRef,

    // Input handlers
    handleInputChange,
    handleKeyDown,
    setInputValue,
    pendingAttachments,
    isAttachingSources,
    attachmentFeedback,
    pendingTemplate,
    availableTemplates,
    handleAttachFiles,
    handleAttachTemplate,
    handleRemovePendingAttachment,
    clearPendingAttachments,
    clearPendingTemplate,
    clearAttachmentFeedback,

    // Chat operations
    handleSend,
    handleUpdateUserMessage,
    handleRegenerateAssistantMessage,
    handleChangeActiveChatModel,
  }
}
