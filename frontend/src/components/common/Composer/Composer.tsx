import { useRef, useState } from 'react'
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
  pendingAttachments?: Array<{
    id: string
    kind: 'url' | 'file'
    label: string
    status?: 'queued' | 'uploading' | 'ingesting' | 'ready' | 'failed'
    error?: string
  }>
  availableTemplates?: Array<{
    id: string
    name: string
    sourceCount: number
  }>
  isAttaching?: boolean
  onAttachUrl?: (url: string) => void
  onAttachFiles?: (files: File[]) => void
  onAttachTemplate?: (templateId: string) => void
  onRemoveAttachment?: (attachmentId: string) => void
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
  pendingAttachments = [],
  availableTemplates = [],
  isAttaching = false,
  onAttachUrl,
  onAttachFiles,
  onAttachTemplate,
  onRemoveAttachment,
}: ComposerProps) {
  const [isAttachPopoverOpen, setIsAttachPopoverOpen] = useState(false)
  const [isUrlPanelOpen, setIsUrlPanelOpen] = useState(false)
  const [isTemplatePanelOpen, setIsTemplatePanelOpen] = useState(false)
  const [urlInputValue, setUrlInputValue] = useState('')
  const [templateSearchValue, setTemplateSearchValue] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEditMode = mode === 'edit'

  const attachPopover = useFloatingPopover({
    isOpen: isAttachPopoverOpen,
    onClose: () => setIsAttachPopoverOpen(false),
    placement: 'top-start',
    panelWidth: COMPOSER_ATTACH_POPOVER_WIDTH,
    panelHeight: COMPOSER_ATTACH_POPOVER_HEIGHT,
    offset: COMPOSER_ATTACH_POPOVER_OFFSET,
  })

  const handleAddUrl = () => {
    const nextUrl = urlInputValue.trim()
    if (!nextUrl) {
      return
    }

    onAttachUrl?.(nextUrl)
    setUrlInputValue('')
    setIsUrlPanelOpen(false)
    setIsTemplatePanelOpen(false)
    setIsAttachPopoverOpen(false)
  }

  const filteredTemplates = availableTemplates.filter((template) => {
    const query = templateSearchValue.trim().toLowerCase()
    if (!query) {
      return true
    }
    return template.name.toLowerCase().includes(query)
  })

  const handleDropFiles = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragActive(false)
    const files = Array.from(event.dataTransfer.files || [])
    if (files.length > 0) {
      onAttachFiles?.(files)
    }
  }

  return (
    <div className={`${style.composer} ${isEditMode ? style['composer-edit-mode'] : ''} ${className}`}>
      <div className={style['composer-inner']}>
        <div
          className={`${style['composer-input-wrapper']} ${isDragActive ? style['composer-input-wrapper-drag-active'] : ''}`}
          onDragEnter={(event) => {
            if (isEditMode) {
              return
            }
            event.preventDefault()
            setIsDragActive(true)
          }}
          onDragOver={(event) => {
            if (isEditMode) {
              return
            }
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
            setIsDragActive(true)
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsDragActive(false)
            }
          }}
          onDrop={handleDropFiles}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className={style['hidden-file-input']}
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              if (files.length > 0) {
                onAttachFiles?.(files)
              }
              e.currentTarget.value = ''
            }}
          />
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            placeholder="Ask anything..."
            aria-label="Chat input"
            rows={1}
          />
          {!isEditMode && pendingAttachments.length > 0 && (
            <div className={style['pending-attachments']}>
              {pendingAttachments.map((attachment) => (
                <button
                  key={attachment.id}
                  type="button"
                  className={`${style['attachment-chip']} ${attachment.status ? style[`attachment-chip-${attachment.status}`] : ''}`}
                  onClick={() => onRemoveAttachment?.(attachment.id)}
                  title={`Remove ${attachment.label}`}
                  disabled={isAttaching}
                >
                  <span className={style['attachment-chip-kind']}>
                    {attachment.kind === 'url' ? 'URL' : 'FILE'}
                  </span>
                  <span className={style['attachment-chip-label']}>{attachment.label}</span>
                  <span className={style['attachment-chip-status']}>
                    {attachment.status === 'uploading'
                      ? 'Uploading'
                      : attachment.status === 'ingesting'
                        ? 'Indexing'
                        : attachment.status === 'ready'
                          ? 'Ready'
                          : attachment.status === 'failed'
                            ? 'Failed'
                            : 'Queued'}
                  </span>
                  <span className={style['attachment-chip-remove']}>x</span>
                </button>
              ))}
            </div>
          )}
          {!isEditMode && isDragActive && (
            <div className={style['drag-overlay']}>Drop files to attach them</div>
          )}
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
                      <button
                        className={style['attach-menu-item']}
                        type="button"
                        onClick={() => {
                          setIsUrlPanelOpen(false)
                          setIsTemplatePanelOpen(false)
                          setIsAttachPopoverOpen(false)
                          fileInputRef.current?.click()
                        }}
                      >
                        <Upload size={18} />
                        <span>Upload Files</span>
                      </button>
                      <button
                        className={style['attach-menu-item']}
                        type="button"
                        onClick={() => {
                          setIsTemplatePanelOpen(false)
                          setIsUrlPanelOpen((prev) => !prev)
                        }}
                      >
                        <Link size={18} />
                        <span>Attach URL</span>
                      </button>
                      {isUrlPanelOpen && (
                        <div className={style['attach-url-panel']}>
                          <input
                            className={style['attach-url-input']}
                            type="url"
                            value={urlInputValue}
                            onChange={(e) => setUrlInputValue(e.target.value)}
                            placeholder="https://example.com/article"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddUrl()
                              }
                            }}
                            autoFocus
                          />
                          <button
                            className={style['attach-url-submit']}
                            type="button"
                            onClick={handleAddUrl}
                            disabled={urlInputValue.trim().length === 0}
                          >
                            Add
                          </button>
                        </div>
                      )}
                      <button
                        className={style['attach-menu-item']}
                        type="button"
                        onClick={() => {
                          setIsUrlPanelOpen(false)
                          setIsTemplatePanelOpen((prev) => !prev)
                        }}
                      >
                        <FileText size={18} />
                        <span>Attach Templates</span>
                      </button>
                      {isTemplatePanelOpen && (
                        <div className={style['attach-template-panel']}>
                          <input
                            className={style['attach-template-search']}
                            type="text"
                            value={templateSearchValue}
                            onChange={(event) => setTemplateSearchValue(event.target.value)}
                            placeholder="Search templates"
                          />
                          <div className={style['attach-template-list']}>
                            {filteredTemplates.length === 0 ? (
                              <div className={style['attach-template-empty']}>No templates found</div>
                            ) : (
                              filteredTemplates.map((template) => (
                                <button
                                  key={template.id}
                                  type="button"
                                  className={style['attach-template-item']}
                                  onClick={() => {
                                    onAttachTemplate?.(template.id)
                                    setTemplateSearchValue('')
                                    setIsTemplatePanelOpen(false)
                                    setIsAttachPopoverOpen(false)
                                  }}
                                >
                                  <span className={style['attach-template-name']}>{template.name}</span>
                                  <span className={style['attach-template-count']}>{template.sourceCount} sources</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
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
                      disabled={isAttaching}
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
