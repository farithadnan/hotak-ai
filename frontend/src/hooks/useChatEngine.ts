import { useState, useRef, useEffect } from 'react'
import { queryAgent, streamQuery } from '../services/query'
import { getChats, createChat, addMessage, generateChatTitle, updateChat } from '../services/chats'
import { loadDocuments, uploadDocuments } from '../services/documents'
import { CHAT_TEXTAREA_MAX_SCROLL_HEIGHT } from '../constants/chat'
import type { ChatThread } from '../types'
import { parseAssistantResponse } from '../utils/assistantResponse'
import type { MessageAttachment } from '../types/models'

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
}

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
  const [isAttachingSources, setIsAttachingSources] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null

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

  const buildLlmContext = (messages: ChatThread['messages']): LlmContextMessage[] =>
    messages
      .filter((message) => message.content.trim().length > 0)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }))

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
      textareaRef.current.style.overflowY = textareaRef.current.scrollHeight > CHAT_TEXTAREA_MAX_SCROLL_HEIGHT ? 'auto' : 'hidden'
    }
  }, [inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }

  const handleAttachUrl = (rawUrl: string) => {
    const normalizedUrl = normalizeUrl(rawUrl)
    if (!normalizedUrl) {
      return
    }

    setPendingAttachments((prev) => {
      if (prev.some((item) => item.kind === 'url' && item.source === normalizedUrl)) {
        return prev
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          kind: 'url',
          label: normalizedUrl,
          source: normalizedUrl,
        },
      ]
    })
  }

  const handleAttachFiles = (files: File[]) => {
    if (files.length === 0) {
      return
    }

    setPendingAttachments((prev) => {
      const dedupeKeys = new Set(prev.filter((item) => item.kind === 'file').map((item) => item.source))
      const additions: PendingAttachment[] = []

      for (const file of files) {
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
        })
      }

      return [...prev, ...additions]
    })
  }

  const handleRemovePendingAttachment = (attachmentId: string) => {
    setPendingAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId))
  }

  const clearPendingAttachments = () => {
    setPendingAttachments([])
  }

  const ingestPendingAttachments = async (): Promise<MessageAttachment[]> => {
    if (pendingAttachments.length === 0) {
      return []
    }

    const urlAttachments = pendingAttachments.filter((item) => item.kind === 'url')
    const fileAttachments = pendingAttachments.filter((item) => item.kind === 'file' && item.file)
    const resolved: MessageAttachment[] = []

    setIsAttachingSources(true)
    try {
      if (urlAttachments.length > 0) {
        try {
          const urlSources = urlAttachments.map((item) => item.source)
          const urlResult = await loadDocuments({ sources: urlSources })
          const ok = new Set([...urlResult.loaded_sources, ...urlResult.cached_sources])
          const failed = new Set(urlResult.failed_sources)

          for (const item of urlAttachments) {
            const status = ok.has(item.source) ? 'ingested' : (failed.has(item.source) ? 'failed' : 'failed')
            resolved.push({
              id: item.id,
              kind: 'url',
              label: item.label,
              source: item.source,
              status,
              error: status === 'failed' ? 'Failed to load URL' : undefined,
            })
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load URL'
          for (const item of urlAttachments) {
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
        try {
          const uploadResult = await uploadDocuments(fileAttachments.map((item) => item.file as File))
          const fileResultsQueueByName = new Map<string, Array<(typeof uploadResult.file_results)[number]>>()
          for (const result of uploadResult.file_results) {
            const queue = fileResultsQueueByName.get(result.file_name) || []
            queue.push(result)
            fileResultsQueueByName.set(result.file_name, queue)
          }

          for (const item of fileAttachments) {
            const queue = fileResultsQueueByName.get(item.label) || []
            const result = queue.shift()
            if (queue.length === 0) {
              fileResultsQueueByName.delete(item.label)
            } else {
              fileResultsQueueByName.set(item.label, queue)
            }

            const isIngested = result?.status === 'ingested' || result?.status === 'cached'
            const status: MessageAttachment['status'] = isIngested ? 'ingested' : 'failed'
            resolved.push({
              id: item.id,
              kind: 'file',
              label: item.label,
              source: result?.source || item.label,
              status,
              error: status === 'failed' ? (result?.error || 'Failed to process file') : undefined,
            })
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to upload file'
          for (const item of fileAttachments) {
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

  const streamAssistantText = async (
    question: string,
    onPartial: (partialText: string) => void,
    chatId?: string,
    modelId?: string,
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

    try {
      let chatId = activeChatId
      let shouldGenerateTitle = activeChat?.title.trim().toLowerCase() === 'new chat'

      // 1. Create new chat if none is active
      if (!chatId) {
        const newChat = await createChat({
          title: 'New Chat',
          model: modelId,
        })
        chatId = newChat.id
        requestChatId = chatId
        shouldGenerateTitle = true
        setChats((prev) => [newChat, ...prev])
        openChat(chatId)
      }

      if (chatId) {
        await ensureChatModel(chatId, modelId)
      }

      const messageAttachments = await ingestPendingAttachments()

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

  const handleUpdateUserMessage = (messageId: string, content: string, modelId?: string) => {
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

      await ensureChatModel(activeChatId, modelId)

      const pendingAssistantId = assistantTarget?.id ?? crypto.randomUUID()
      const pendingAssistantCreatedAt = assistantTarget?.created_at ?? new Date().toISOString()

      const baseMessages = activeChat.messages
        .filter((message, idx) => idx <= userIndex || message.id === pendingAssistantId)
        .map((message) => {
          if (message.id === messageId) {
            return {
              ...message,
              content: trimmedContent,
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
    handleAttachUrl,
    handleAttachFiles,
    handleRemovePendingAttachment,
    clearPendingAttachments,

    // Chat operations
    handleSend,
    handleUpdateUserMessage,
    handleRegenerateAssistantMessage,
    handleChangeActiveChatModel,
  }
}
