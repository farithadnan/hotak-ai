import { useEffect, type RefObject } from 'react'

/**
 * Hook that triggers a callback when a click is detected outside the referenced element.
 * @param ref a reference to the target element
 * @param callback a function to be called on outside click
 * @param isActive a boolean to enable or disable the outside click detection
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  isActive: boolean
) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback()
      }
    }

    if (isActive) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [ref, callback, isActive])
}
