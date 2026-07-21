import React, { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
 *  Modal — premium SaaS dialog
 *
 *  - Centered, backdrop blur, dark overlay
 *  - Fade + scale animation (180-220ms)
 *  - ESC closes, click outside closes
 *  - Focus trap, autofocus first focusable
 *  - Restores focus to the previously focused element on close
 *  - 24px radius, generous padding, soft shadow
 * ───────────────────────────────────────────────────────────── */

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<Size, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Compact dialog (rename) vs. full form (add/edit/claim) */
  size?: Size
  /** Disable ESC + outside click (e.g. while saving) */
  dismissDisabled?: boolean
  /** ARIA label for screen readers. Defaults to title. */
  ariaLabel?: string
  children: React.ReactNode
}

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function Modal({
  open,
  onClose,
  size = 'md',
  dismissDisabled = false,
  ariaLabel,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const tryClose = useCallback(() => {
    if (dismissDisabled) return
    onClose()
  }, [dismissDisabled, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // ESC to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        tryClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, tryClose])

  // Focus management — remember the trigger, autofocus first field, trap Tab
  useEffect(() => {
    if (!open) return
    previousFocusRef.current = (document.activeElement as HTMLElement) ?? null

    const t = setTimeout(() => {
      const root = panelRef.current
      if (!root) return
      const focusables = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      const first = focusables[0]
      if (first) {
        first.focus()
      } else {
        root.focus()
      }
    }, 60)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const root = panelRef.current
      if (!root) return
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS))
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last || !root.contains(active)) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKeyDown)
      // Restore focus to the element that opened the dialog
      const prev = previousFocusRef.current
      if (prev && typeof prev.focus === 'function') {
        prev.focus()
      }
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      aria-hidden={false}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={tryClose}
        className="absolute inset-0 bg-[#0B0B0F]/45 backdrop-blur-md"
        style={{
          animation: 'modalBackdropIn 200ms cubic-bezier(0.25, 0.1, 0.25, 1) both',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`relative z-10 w-full overflow-hidden rounded-3xl bg-white shadow-[0_24px_64px_-20px_rgba(15,23,42,0.35),0_8px_24px_-8px_rgba(15,23,42,0.18)] outline-none ${SIZE_CLASS[size]}`}
        style={{
          animation: 'modalPanelIn 200ms cubic-bezier(0.25, 0.1, 0.25, 1) both',
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes modalBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalPanelIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body,
  )
}

/* ─────────────────────────────────────────────────────────────
 *  ModalHeader — title + subtitle + optional close
 *  ModalFooter — sticky footer with action buttons
 *  ModalBody — padded body
 *  ModalClose — close button
 * ───────────────────────────────────────────────────────────── */

interface ModalHeaderProps {
  icon?: React.ReactNode
  iconTone?: 'blue' | 'amber' | 'red' | 'emerald' | 'slate'
  title: string
  subtitle?: React.ReactNode
  onClose?: () => void
  closeDisabled?: boolean
}

const ICON_TONE: Record<NonNullable<ModalHeaderProps['iconTone']>, string> = {
  blue: 'bg-[#EFF4FF] text-[#3B82F6]',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  slate: 'bg-slate-100 text-slate-600',
}

export function ModalHeader({
  icon,
  iconTone = 'slate',
  title,
  subtitle,
  onClose,
  closeDisabled,
}: ModalHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 px-7 pt-6">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${ICON_TONE[iconTone]}`}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 pt-0.5">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-[#111111]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">{subtitle}</p>
          )}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          aria-label="Fermer"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6B7280] transition-all duration-200 hover:bg-[#F5F5F7] hover:text-[#111111] active:scale-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={15} strokeWidth={2.2} />
        </button>
      )}
    </header>
  )
}

export function ModalBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-7 py-5 ${className}`}>{children}</div>
}

interface ModalFooterProps {
  children: React.ReactNode
  /** Stays at the bottom of the panel even when content is short */
  sticky?: boolean
}

export function ModalFooter({ children, sticky = true }: ModalFooterProps) {
  return (
    <footer
      className={`flex items-center justify-end gap-2 border-t border-[#F0F0F0] bg-[#FAFAFA]/60 px-7 py-4 ${sticky ? '' : ''}`}
    >
      {children}
    </footer>
  )
}

/* ─────────────────────────────────────────────────────────────
 *  ModalButton — primary, secondary, danger variants
 *  Pill shape, soft shadow, hover lift, scale on press.
 * ───────────────────────────────────────────────────────────── */

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    'bg-[#111111] text-white shadow-[0_2px_8px_-2px_rgba(17,17,17,0.35)] hover:bg-[#1F1F23] hover:shadow-[0_6px_18px_-4px_rgba(17,17,17,0.4)]',
  secondary:
    'bg-white text-[#374151] border border-[#ECECEC] hover:bg-[#F5F5F7] hover:border-[#DCDCDC]',
  danger:
    'bg-red-600 text-white shadow-[0_2px_8px_-2px_rgba(220,38,38,0.4)] hover:bg-red-700 hover:shadow-[0_6px_18px_-4px_rgba(220,38,38,0.45)]',
  ghost: 'bg-transparent text-[#6B7280] hover:bg-[#F5F5F7] hover:text-[#111111]',
}

interface ModalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  leadingIcon?: React.ReactNode
}

export function ModalButton({
  variant = 'secondary',
  loading,
  leadingIcon,
  children,
  disabled,
  className = '',
  ...rest
}: ModalButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      type="button"
      {...rest}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASS[variant]} ${className}`}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
        />
      ) : (
        leadingIcon
      )}
      {children}
    </button>
  )
}
