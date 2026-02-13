import { useEffect } from 'react'
import styles from './Toastr.module.css'

export type ToastrType = 'success' | 'error' | 'info'

export interface ToastrProps {
  open: boolean
  message: string
  type?: ToastrType
  duration?: number // ms
  onClose: () => void
}

export function Toastr({ open, message, type = 'info', duration = 3000, onClose }: ToastrProps) {
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [open, duration, onClose])

  if (!open) return null
  return (
    <div className={`${styles.toastr} ${styles[`toastr--${type}`]}`}>
      {message}
    </div>
  )
}