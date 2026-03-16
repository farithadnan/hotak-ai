
import React from 'react';
import { Bot, Copy, LoaderCircle, RotateCcw, Pencil } from '../../../icons';
import { Composer } from '../../common/Composer/Composer';
import { Toastr } from '../../common/Toastr/Toastr';
import { ChatLoadingSkeleton } from './ChatLoadingSkeleton';
import { parseAssistantResponse } from '../../../utils/assistantResponse';
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

  const copyToClipboard = async (content: string) => {
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
  };

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
                      const sourceItems = message.sources && message.sources.length > 0 ? message.sources : parsed.sources;
                      const hasSources = sourceItems.length > 0;

                      return (
                        <>
                    <div className="assistant-heading">
                      <span className="assistant-icon" aria-hidden="true">
                        <Bot size={14} />
                      </span>
                      <span className="assistant-label">Hotak AI</span>
                      {activeModelLabel && <span className="assistant-model-badge">[{activeModelLabel}]</span>}
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
                        <div className="assistant-text">{displayContent}</div>
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
                                    <span className="sources-list-name">{source}</span>
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
    </section>
  );
};

export default ChatWindow;
