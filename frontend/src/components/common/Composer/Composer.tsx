import { useState } from 'react'
import { Briefcase, Mic, SendHorizontal, Plus, Upload, Link, FileText } from '../../../icons'
import { useFloatingPopover } from '../../../hooks/useFloatingPopover'
import {
  COMPOSER_ATTACH_POPOVER_HEIGHT,
  COMPOSER_ATTACH_POPOVER_OFFSET,
  COMPOSER_ATTACH_POPOVER_WIDTH,
} from '../../../constants/chat'

import style from './Composer.module.css'

type ComposerProps = {
  inputValue: string
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  onCancel?: () => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  className?: string
  mode?: 'default' | 'edit'
}

export function Composer({
  inputValue,
  onInputChange,
  onKeyDown,
  onSend,
  onCancel,
  textareaRef,
  className = '',
  mode = 'default',
}: ComposerProps) {
  const [isAttachPopoverOpen, setIsAttachPopoverOpen] = useState(false)
  const isEditMode = mode === 'edit'

  const attachPopover = useFloatingPopover({
    isOpen: isAttachPopoverOpen,
    onClose: () => setIsAttachPopoverOpen(false),
    placement: 'top-start',
    panelWidth: COMPOSER_ATTACH_POPOVER_WIDTH,
    panelHeight: COMPOSER_ATTACH_POPOVER_HEIGHT,
    offset: COMPOSER_ATTACH_POPOVER_OFFSET,
  })

  return (
    <div className={`${style.composer} ${isEditMode ? style['composer-edit-mode'] : ''} ${className}`}>
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
          <div className={`${style['composer-actions']} ${isEditMode ? style['composer-actions-edit'] : ''}`}>
            {!isEditMode && (
              <div className={style['composer-actions-left']}>
                <div className={style['attach-wrapper']}>
                  <button 
                    className={style['composer-action-button']} 
                    type="button" 
                    title="More"
                    onClick={(e) => {
                      if (isAttachPopoverOpen) {
                        setIsAttachPopoverOpen(false)
                        return
                      }
                      attachPopover.openFromElement(e.currentTarget)
                      setIsAttachPopoverOpen(true)
                    }}
                  >
                    <Plus size={20} />
                  </button>
                  {isAttachPopoverOpen && (
                    <div
                      ref={attachPopover.popoverRef}
                      className={style['attach-popover']}
                      style={attachPopover.floatingStyle}
                    >
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
            )}
            <div className={style['composer-actions-right']}>
              {isEditMode ? (
                <>
                  <button
                    className={`${style['composer-text-button']} ${style['composer-text-button-cancel']}`}
                    type="button"
                    title="Cancel"
                    onClick={onCancel}
                  >
                    Cancel
                  </button>
                  <button
                    className={`${style['composer-text-button']} ${style['composer-text-button-send']}`}
                    type="button"
                    title="Send"
                    onClick={onSend}
                    disabled={inputValue.trim().length === 0}
                  >
                    Send
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
