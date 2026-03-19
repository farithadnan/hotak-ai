import type { ReactNode } from 'react'
import style from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const isDangerAction = /delete|remove/i.test(`${title} ${confirmText}`)

  return (
    <div className={style['confirm-dialog-backdrop']}>
      <div className={style['confirm-dialog']}>
        {title && <div className={style['confirm-dialog-title']}>{title}</div>}
        <div className={style['confirm-dialog-message']}>{message}</div>
        <div className={style['confirm-dialog-actions']}>
          <button className={style['confirm-dialog-cancel']} type="button" onClick={onCancel}>{cancelText}</button>
          <button
            className={`${style['confirm-dialog-confirm']} ${isDangerAction ? style['is-danger'] : ''}`}
            type="button"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}