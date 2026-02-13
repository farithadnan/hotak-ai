import { useRef, useState } from 'react'
import { Briefcase, Mic, SendHorizontal, Plus, Upload, Link, FileText } from 'lucide-react'
import { useClickOutside } from '../../../hooks/useClickOutside'

import style from './Composer.module.css'

type ComposerProps = {
  inputValue: string
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  className?: string
}

export function Composer({ inputValue, onInputChange, onKeyDown, onSend, textareaRef, className = '' }: ComposerProps) {
  const [isAttachPopoverOpen, setIsAttachPopoverOpen] = useState(false)
  const attachPopoverRef = useRef<HTMLDivElement>(null)

  useClickOutside(attachPopoverRef, () => setIsAttachPopoverOpen(false), isAttachPopoverOpen)

  return (
    <div className={`${style.composer} ${className}`}>
      <div className={style['composer-inner']}>
        <div className={style['composer-input-wrapper']}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            placeholder="Ask anything..."
            aria-label="Chat input"
            rows={1}
          />
          <div className={style['composer-actions']}>
            <div className={style['composer-actions-left']}>
              <div className={style['attach-wrapper']} ref={attachPopoverRef}>
                <button 
                  className={style['composer-action-button']} 
                  type="button" 
                  title="More"
                  onClick={() => setIsAttachPopoverOpen(!isAttachPopoverOpen)}
                >
                  <Plus size={20} />
                </button>
                {isAttachPopoverOpen && (
                  <div className={style['attach-popover']}>
                    <button className={style['attach-menu-item']} type="button">
                      <Upload size={18} />
                      <span>Upload Files</span>
                    </button>
                    <button className={style['attach-menu-item']} type="button">
                      <Link size={18} />
                      <span>Attach URL</span>
                    </button>
                    <button className={style['attach-menu-item']} type="button">
                      <FileText size={18} />
                      <span>Attach Templates</span>
                    </button>
                  </div>
                )}
              </div>
              <button className={style['composer-action-button']} type="button" title="Tools">
                <Briefcase size={20} />
              </button>
            </div>
            <div className={style['composer-actions-right']}>
              <button className={style['composer-action-button']} type="button" title="Use Microphone">
                <Mic size={20} />
              </button>
              {inputValue.trim().length > 0 && (
                <button
                  className={`${style['composer-action-button']} ${style['send-button']}`}
                  type="button"
                  title="Send Message"
                  onClick={onSend}
                >
                  <SendHorizontal size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
