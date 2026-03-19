import { useEffect } from 'react'
import { useRef } from 'react'
import { useState } from 'react'
import { DEFAULT_TOAST_DURATION_MS } from '../../../constants/ui'
import { AlertTriangle, CheckCircle, Info, XCircle } from '../../../icons'
import styles from './Toastr.module.css'


export type ToastrType = 'success' | 'error' | 'info' | 'warning'

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

const TOAST_ANIMATION_MS = 180

export function Toastr({ open, message, title, type = 'info', duration = DEFAULT_TOAST_DURATION_MS, position = 'top-right', onClose }: ToastrProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeAnimationRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remainingRef = useRef(duration)
  const startedAtRef = useRef<number | null>(null)
  const [isRendered, setIsRendered] = useState(open)
  const [isExiting, setIsExiting] = useState(false)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const clearCloseAnimation = () => {
    if (closeAnimationRef.current) {
      clearTimeout(closeAnimationRef.current)
      closeAnimationRef.current = null
    }
  }

  const startTimer = (timeoutMs: number) => {
    clearTimer()
    startedAtRef.current = Date.now()
    timerRef.current = setTimeout(onClose, timeoutMs)
  }

  useEffect(() => {
    clearCloseAnimation()

    if (open) {
      setIsRendered(true)
      setIsExiting(false)
      remainingRef.current = duration
      startTimer(duration)
    } else {
      clearTimer()
      setIsExiting(true)
      closeAnimationRef.current = setTimeout(() => {
        setIsRendered(false)
      }, TOAST_ANIMATION_MS)
    }

    return () => {
      clearTimer()
      clearCloseAnimation()
    }
  }, [open, duration, onClose])

  if (!isRendered) return null

  const handleMouseEnter = () => {
    if (!startedAtRef.current) {
      return
    }

    const elapsed = Date.now() - startedAtRef.current
    remainingRef.current = Math.max(0, remainingRef.current - elapsed)
    clearTimer()
  }

  const handleMouseLeave = () => {
    if (remainingRef.current <= 0) {
      onClose()
      return
    }
    startTimer(remainingRef.current)
  }

  const icon = type === 'success'
    ? <CheckCircle size={16} />
    : type === 'error'
      ? <XCircle size={16} />
      : type === 'warning'
        ? <AlertTriangle size={16} />
        : <Info size={16} />

  return (
    <div className={[
      styles.toastr,
      styles[`toastr--${type}`],
      styles[`toastr--${position}`],
      isExiting ? styles['toastr--exit'] : styles['toastr--enter'],
    ].join(' ')} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className={styles['toastr-icon-pane']} aria-hidden="true">
        <span className={styles['toastr-icon']}>{icon}</span>
      </div>
      <div className={styles['toastr-content']}>
        {title && <span className={styles['toastr-title']}>{title}</span>}
        <span className={styles['toastr-message']}>{message}</span>
      </div>
    </div>
  )
}