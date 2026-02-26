
import React from 'react';
import { Composer } from '../../common/Composer/Composer';
import type { ChatThread } from '../../../types';

interface ChatWindowProps {
  chat: ChatThread | null;
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  username?: string;
  hasChatSession?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  inputValue,
  onInputChange,
  onKeyDown,
  onSend,
  textareaRef,
  username = 'User',
  hasChatSession = false,
}) => {
  const lastUserMessageId = chat
    ? [...chat.messages].reverse().find((message) => message.role === 'user')?.id || null
    : null;

  return (
    <section className="chat-area">
      {!hasChatSession && (
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

      {chat && (
        <>
          <div className="chat-scroll chat-scroll-fixed">
            {chat.messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === 'user'
                    ? message.id === lastUserMessageId
                      ? 'message-row user is-last'
                      : 'message-row user'
                    : 'message-row assistant'
                }
              >
                {message.role === 'user' && (
                  <div className="message-block">
                    <div className="message-timestamp">11/02/2026 at 10:41 AM</div>
                    <div className="bubble">{message.content}</div>
                    {message.id === lastUserMessageId && (
                      <div className="message-actions">
                        {/* Add action buttons here */}
                      </div>
                    )}
                  </div>
                )}

                {message.role === 'assistant' && (
                  <div className="assistant-block">
                    <div className="message-timestamp">11/02/2026 at 10:41 AM</div>
                    <div className="assistant-text">{message.content}</div>
                    <div className="assistant-actions">
                      {/* Add action buttons here */}
                    </div>
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
    </section>
  );
};

export default ChatWindow;
