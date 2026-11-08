import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';

/**
 * useBodyScrollLock
 * Prevents background page scrolling ("scroll bleed") while a modal or overlay is open.
 * Safely handles nested modals using a reference counter.
 */
export function useBodyScrollLock(isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = originalOverflow || '';
      }
    };
  }, [isOpen]);
}
