import type { ReactNode } from 'react'

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
  return (
    <div className="confirm-dialog-backdrop">
      <div className="confirm-dialog">
        {title && <div className="confirm-dialog-title">{title}</div>}
        <div className="confirm-dialog-message">{message}</div>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-cancel" type="button" onClick={onCancel}>{cancelText}</button>
          <button className="confirm-dialog-confirm" type="button" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}