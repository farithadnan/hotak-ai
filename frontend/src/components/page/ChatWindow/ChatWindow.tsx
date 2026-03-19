
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bot, Copy, LoaderCircle, RotateCcw, Pencil } from '../../../icons';
import { Composer } from '../../common/Composer/Composer';
import { Toastr } from '../../common/Toastr/Toastr';
import { ChatLoadingSkeleton } from './ChatLoadingSkeleton';
import { dedupeSources, getSourceHref, parseAssistantResponse } from '../../../utils/assistantResponse';
import { prettifyModelName } from '../../../services/models';
import { EXTERNAL_LINK_REL, EXTERNAL_LINK_TARGET } from '../../../constants/chat';
import type { ChatThread } from '../../../types';

interface ChatWindowProps {
  chat: ChatThread | null;
  isLoadingChats: boolean;
  hasActiveChatId: boolean;
  activeModelLabel?: string;
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onUpdateUserMessage: (messageId: string, content: string) => void;
  onRegenerateAssistantMessage: (messageId: string) => void;
  regeneratingAssistantMessageId: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  pendingAttachments: Array<{
    id: string;
    kind: 'url' | 'file';
    label: string;
    status?: 'queued' | 'uploading' | 'ingesting' | 'ready' | 'failed';
    error?: string;
  }>;
  availableTemplates: Array<{
    id: string;
    name: string;
    sourceCount: number;
  }>;
  isAttachingSources: boolean;
  attachmentFeedback: {
    title?: string;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null;
  onAttachUrl: (url: string) => void;
  onAttachFiles: (files: File[]) => void;
  onAttachTemplate: (templateId: string) => void;
  onRemovePendingAttachment: (attachmentId: string) => void;
  onClearAttachmentFeedback: () => void;
  username?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  isLoadingChats,
  hasActiveChatId,
  activeModelLabel,
  inputValue,
  onInputChange,
  onKeyDown,
  onSend,
  onUpdateUserMessage,
  onRegenerateAssistantMessage,
  regeneratingAssistantMessageId,
  textareaRef,
  pendingAttachments,
  availableTemplates,
  isAttachingSources,
  attachmentFeedback,
  onAttachUrl,
  onAttachFiles,
  onAttachTemplate,
  onRemovePendingAttachment,
  onClearAttachmentFeedback,
  username = 'User',
}) => {
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null);
  const [editingContent, setEditingContent] = React.useState('');
  const [toastrOpen, setToastrOpen] = React.useState(false);
  const [toastrMessage, setToastrMessage] = React.useState('Copied to clipboard');
  const [openSourcesMessageId, setOpenSourcesMessageId] = React.useState<string | null>(null);
  const editTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const isResolvingActiveChat = isLoadingChats && hasActiveChatId && !chat;

  const lastUserMessageId = chat
    ? [...chat.messages].reverse().find((message) => message.role === 'user')?.id || null
    : null;

  const formatMessageTimestamp = (isoDate: string) => {
    const parsedDate = new Date(isoDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Invalid date';
    }
    return parsedDate.toLocaleString([], {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyToClipboard = React.useCallback(async (content: string) => {
    let isCopied = false;

    try {
      await navigator.clipboard.writeText(content);
      isCopied = true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      isCopied = document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    if (isCopied) {
      setToastrOpen(false);
      setToastrMessage('Copied to clipboard');
      requestAnimationFrame(() => setToastrOpen(true));
    }
  }, []);

  const handleStartEditing = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  const handleCancelEditing = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleSaveEditing = () => {
    if (!editingMessageId) {
      return;
    }

    const trimmed = editingContent.trim();
    if (!trimmed) {
      return;
    }

    onUpdateUserMessage(editingMessageId, trimmed);
    handleCancelEditing();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEditing();
    }
  };

  React.useEffect(() => {
    if (editingMessageId) {
      requestAnimationFrame(() => {
        editTextareaRef.current?.focus();
      });
    }
  }, [editingMessageId]);

  // Ref for chat scroll area
  const chatScrollRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom when chat.messages changes
  React.useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chat?.messages.length]);

  const renderMarkdownCode = React.useCallback((props: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
    const { inline, className, children, ...rest } = props;
    const rawCode = React.Children.toArray(children).join('').replace(/\n$/, '');
    const languageMatch = /language-([a-zA-Z0-9_+-]+)/.exec(className || '');
    const languageLabel = (languageMatch?.[1] || 'code').toLowerCase();
    const isBlockCode = Boolean(languageMatch) || rawCode.includes('\n');

    if (inline || !isBlockCode) {
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    }

    return (
      <div className="assistant-code-block">
        <div className="assistant-code-header">
          <span className="assistant-code-language">{languageLabel}</span>
          <button
            type="button"
            className="assistant-code-copy"
            onClick={() => void copyToClipboard(rawCode)}
            title="Copy code"
            aria-label="Copy code"
          >
            Copy
          </button>
        </div>
        <SyntaxHighlighter
          language={languageMatch?.[1] || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            border: 'none',
            borderRadius: 0,
            background: 'transparent',
            padding: '0.85rem 0.95rem',
            fontSize: '0.88rem',
          }}
          codeTagProps={{ className }}
        >
          {rawCode}
        </SyntaxHighlighter>
      </div>
    );
  }, [copyToClipboard]);

  const markdownComponents = React.useMemo(() => ({
    a: ({ href, children, ...props }: React.ComponentPropsWithoutRef<'a'>) => (
      <a
        {...props}
        href={href}
        target={EXTERNAL_LINK_TARGET}
        rel={EXTERNAL_LINK_REL}
      >
        {children}
      </a>
    ),
    pre: ({ children }: React.ComponentPropsWithoutRef<'pre'>) => <>{children}</>,
    code: renderMarkdownCode,
  }), [renderMarkdownCode]);

  return (
    <section className="chat-area">
      {isResolvingActiveChat && <ChatLoadingSkeleton />}

      {!isResolvingActiveChat && (!chat || (chat && chat.messages.length === 0)) && (
        <div className="empty-state">
          <div className="empty-greeting">
            <h2 className="greeting-kicker">Nice to meet you, {username}</h2>
          </div>
          <Composer
            inputValue={inputValue}
            onInputChange={onInputChange}
            onKeyDown={onKeyDown}
            onSend={onSend}
            textareaRef={textareaRef}
            className="empty-composer"
            pendingAttachments={pendingAttachments}
            availableTemplates={availableTemplates}
            isAttaching={isAttachingSources}
            onAttachUrl={onAttachUrl}
            onAttachFiles={onAttachFiles}
            onAttachTemplate={onAttachTemplate}
            onRemoveAttachment={onRemovePendingAttachment}
          />
        </div>
      )}

      {chat && chat.messages.length > 0 && (
        <>
          <div className="chat-scroll chat-scroll-fixed" ref={chatScrollRef}>
            {chat.messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === 'user'
                    ? 'message-row user'
                    : 'message-row assistant'
                }
              >
                {message.role === 'user' && (
                  <div className={editingMessageId === message.id ? 'message-block is-editing' : 'message-block'}>
                    <div className="message-timestamp">{formatMessageTimestamp(message.created_at)}</div>
                    {editingMessageId === message.id ? (
                      <div className="message-edit-wrap">
                        <Composer
                          inputValue={editingContent}
                          onInputChange={(e) => setEditingContent(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          onSend={handleSaveEditing}
                          onCancel={handleCancelEditing}
                          textareaRef={editTextareaRef}
                          className="inline-edit-composer"
                          mode="edit"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="bubble">{message.content}</div>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="user-attachments-row">
                            {message.attachments.map((attachment) => {
                              const isUrl = attachment.kind === 'url' && /^https?:\/\//i.test(attachment.source);
                              const statusClass = attachment.status === 'failed' ? 'is-failed' : 'is-ingested';

                              if (isUrl) {
                                return (
                                  <a
                                    key={attachment.id}
                                    className={`user-attachment-pill ${statusClass}`}
                                    href={attachment.source}
                                    target={EXTERNAL_LINK_TARGET}
                                    rel={EXTERNAL_LINK_REL}
                                  >
                                    {attachment.label}
                                  </a>
                                );
                              }

                              return (
                                <span key={attachment.id} className={`user-attachment-pill ${statusClass}`}>
                                  {attachment.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <div className="message-actions">
                          {message.id === lastUserMessageId && (
                            <button
                              type="button"
                              className="chat-action-btn icon-only"
                              onClick={() => handleStartEditing(message.id, message.content)}
                              title="Edit"
                              aria-label="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="chat-action-btn icon-only"
                            onClick={() => void copyToClipboard(message.content)}
                            title="Copy"
                            aria-label="Copy"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {message.role === 'assistant' && (
                  <div className="assistant-block">
                    {(() => {
                      const parsed = parseAssistantResponse(message.content);
                      const displayContent = parsed.content || message.content;
                      const rawSourceItems = message.sources && message.sources.length > 0 ? message.sources : parsed.sources;
                      const sourceItems = dedupeSources(rawSourceItems);
                      const hasSources = sourceItems.length > 0;

                      return (
                        <>
                    <div className="assistant-heading">
                      <span className="assistant-icon" aria-hidden="true">
                        <Bot size={14} />
                      </span>
                      <span className="assistant-label">Hotak AI</span>
                      {(message.model || activeModelLabel) && (
                        <span className="assistant-model-badge">
                          [{message.model ? prettifyModelName(message.model) : activeModelLabel}]
                        </span>
                      )}
                    </div>
                    <div className="message-timestamp">{formatMessageTimestamp(message.created_at)}</div>
                    {message.content.trim() === '' ? (
                      <div className="assistant-thinking" aria-live="polite" aria-label="Assistant is thinking">
                        <span className="thinking-dot"></span>
                        <span className="thinking-dot"></span>
                        <span className="thinking-dot"></span>
                      </div>
                    ) : (
                      <>
                        <div className="assistant-text">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {displayContent}
                          </ReactMarkdown>
                        </div>
                        {hasSources && (
                          <div className="assistant-sources-wrap">
                            <button
                              type="button"
                              className="sources-pill"
                              onClick={() => setOpenSourcesMessageId((prev) => (prev === message.id ? null : message.id))}
                              title="Show sources"
                              aria-label="Show sources"
                            >
                              {sourceItems.length} {sourceItems.length === 1 ? 'Source' : 'Sources'}
                            </button>
                            {openSourcesMessageId === message.id && (
                              <div className="sources-list-panel">
                                {sourceItems.map((source, idx) => (
                                  <div key={`${message.id}-source-${idx}`} className="sources-list-item">
                                    <span className="sources-list-index-badge">{idx + 1}</span>
                                    {(() => {
                                      const href = getSourceHref(source);
                                      if (!href) {
                                        return <span className="sources-list-name">{source}</span>;
                                      }

                                      return (
                                        <a
                                          className="sources-list-link"
                                          href={href}
                                          target={EXTERNAL_LINK_TARGET}
                                          rel={EXTERNAL_LINK_REL}
                                        >
                                          {source}
                                        </a>
                                      );
                                    })()}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="assistant-actions">
                          <button
                            type="button"
                            className="chat-action-btn icon-only"
                            onClick={() => void copyToClipboard(message.content)}
                            title="Copy"
                            aria-label="Copy"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            className="chat-action-btn icon-only"
                            onClick={() => onRegenerateAssistantMessage(message.id)}
                            title="Regenerate"
                            aria-label="Regenerate"
                            disabled={regeneratingAssistantMessageId === message.id}
                          >
                            {regeneratingAssistantMessageId === message.id ? (
                              <LoaderCircle size={14} className="spin" />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="composer-fixed-global">
            <Composer
              inputValue={inputValue}
              onInputChange={onInputChange}
              onKeyDown={onKeyDown}
              onSend={onSend}
              textareaRef={textareaRef}
              pendingAttachments={pendingAttachments}
              availableTemplates={availableTemplates}
              isAttaching={isAttachingSources}
              onAttachUrl={onAttachUrl}
              onAttachFiles={onAttachFiles}
              onAttachTemplate={onAttachTemplate}
              onRemoveAttachment={onRemovePendingAttachment}
            />
          </div>
        </>
      )}

      <Toastr
        open={toastrOpen}
        message={toastrMessage}
        type="success"
        position="top-right"
        onClose={() => setToastrOpen(false)}
      />
      <Toastr
        open={Boolean(attachmentFeedback)}
        title={attachmentFeedback?.title}
        message={attachmentFeedback?.message || ''}
        type={attachmentFeedback?.type || 'info'}
        position="top-right"
        onClose={onClearAttachmentFeedback}
      />
    </section>
  );
};

export default ChatWindow;
