import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  DEFAULT_FLOATING_POPOVER_HEIGHT,
  DEFAULT_FLOATING_POPOVER_OFFSET,
  DEFAULT_FLOATING_POPOVER_WIDTH,
  FLOATING_POPOVER_MIN_WIDTH,
  FLOATING_POPOVER_VIEWPORT_GAP,
} from '../constants/ui'

type FloatingPlacement = 'top-start' | 'bottom-start' | 'left-start' | 'right-start'

type UseFloatingPopoverOptions = {
  isOpen: boolean
  onClose: () => void
  placement?: FloatingPlacement
  panelWidth?: number
  panelHeight?: number
  offset?: number
}

type Position = {
  top: number
  left: number
}

export function useFloatingPopover({
  isOpen,
  onClose,
  placement = 'bottom-start',
  panelWidth = DEFAULT_FLOATING_POPOVER_WIDTH,
  panelHeight = DEFAULT_FLOATING_POPOVER_HEIGHT,
  offset = DEFAULT_FLOATING_POPOVER_OFFSET,
}: UseFloatingPopoverOptions) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null)
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 })
  const [resolvedWidth, setResolvedWidth] = useState(panelWidth)

  const openFromElement = (element: HTMLElement) => {
    setAnchorElement(element)
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      const isInsidePopover = Boolean(popoverRef.current?.contains(target))
      const isInsideAnchor = Boolean(anchorElement?.contains(target))

      if (!isInsidePopover && !isInsideAnchor) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [anchorElement, isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !anchorElement) {
      return
    }

    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const gap = FLOATING_POPOVER_VIEWPORT_GAP
      const maxAllowedWidth = Math.max(FLOATING_POPOVER_MIN_WIDTH, viewportWidth - gap * 2)
      const nextWidth = Math.min(panelWidth, maxAllowedWidth)

      let nextTop = rect.bottom + offset
      let nextLeft = rect.left

      if (placement === 'top-start') {
        nextTop = rect.top - panelHeight - offset
        nextLeft = rect.left
      }

      if (placement === 'left-start') {
        nextTop = rect.top
        nextLeft = rect.left - nextWidth - offset
      }

      if (placement === 'right-start') {
        nextTop = rect.top
        nextLeft = rect.right + offset
      }

      if (placement === 'bottom-start') {
        nextTop = rect.bottom + offset
        nextLeft = rect.left
      }

      nextLeft = Math.max(gap, Math.min(nextLeft, viewportWidth - nextWidth - gap))
      nextTop = Math.max(gap, Math.min(nextTop, viewportHeight - panelHeight - gap))

      setResolvedWidth(nextWidth)
      setPosition({ top: nextTop, left: nextLeft })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorElement, isOpen, offset, panelHeight, panelWidth, placement])

  const floatingStyle: CSSProperties = {
    position: 'fixed',
    top: `${position.top}px`,
    left: `${position.left}px`,
    width: `${resolvedWidth}px`,
  }

  return {
    popoverRef,
    position,
    floatingStyle,
    openFromElement,
  }
}