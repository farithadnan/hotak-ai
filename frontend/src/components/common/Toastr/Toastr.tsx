import { useEffect } from 'react'
import styles from './Toastr.module.css'


export type ToastrType = 'success' | 'error' | 'info'

export type ToastrPosition = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'

export interface ToastrProps {
  open: boolean
  message: string
  title?: string
  type?: ToastrType
  duration?: number // ms
  position?: ToastrPosition
  onClose: () => void
}

export function Toastr({ open, message, title, type = 'info', duration = 3000, position = 'top-right', onClose }: ToastrProps) {
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [open, duration, onClose])

  if (!open) return null
  return (
    <div className={[
      styles.toastr,
      styles[`toastr--${type}`],
      styles[`toastr--${position}`],
    ].join(' ')}>
      {title && <span className={styles['toastr-title']}>{title}</span>}
      {message}
    </div>
  )
}