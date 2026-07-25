import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
 *  Dropdown — fully custom popover select
 *
 *  Why not <select>? Browser-native option lists are unstyleable
 *  (gray, system font, no transitions). This component renders a
 *  styled trigger + a floating panel that animates in.
 *
 *  Features:
 *   - keyboard nav (↑ ↓ Home End Enter Esc)
 *   - click-outside & Escape close
 *   - ARIA: role="listbox" / role="option" / aria-expanded
 *   - per-option icon + label + optional hint
 *   - smooth open/close transition (cubic-bezier 240ms)
 * ───────────────────────────────────────────────────────────── */

export interface DropdownOption {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
  /** Right-aligned badge text (e.g. count). */
  badge?: React.ReactNode
  /** Disable this option. */
  disabled?: boolean
}

interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  /** Short label rendered above the trigger. */
  label?: string
  /** Visible trigger text when no label/option is selected. */
  placeholder?: string
  /** Trigger width — defaults to fit content. */
  width?: string
  /** Match the "small" controls used in the page header. */
  size?: 'sm' | 'md'
  /** Show a small trigger on the left (mirrors leadingIcon of TextField). */
  leadingIcon?: React.ReactNode
  /** Disable the whole control. */
  disabled?: boolean
  className?: string
}

export default function Dropdown({
  options,
  value,
  onChange,
  label,
  placeholder = 'Sélectionner',
  width,
  size = 'sm',
  leadingIcon,
  disabled,
  className = '',
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number>(() =>
    Math.max(0, options.findIndex(o => o.value === value)),
  )
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const id = useId()

  // Sync active index with value changes
  useEffect(() => {
    const idx = options.findIndex(o => o.value === value)
    if (idx >= 0) setActiveIdx(idx)
  }, [value, options])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape + keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => {
          const next = Math.min(options.length - 1, i + 1)
          optionRefs.current[next]?.focus()
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => {
          const next = Math.max(0, i - 1)
          optionRefs.current[next]?.focus()
          return next
        })
      } else if (e.key === 'Home') {
        e.preventDefault()
        setActiveIdx(0)
        optionRefs.current[0]?.focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        const last = options.length - 1
        setActiveIdx(last)
        optionRefs.current[last]?.focus()
      } else if (e.key === 'Enter' || e.key === ' ') {
        const opt = options[activeIdx]
        if (opt && !opt.disabled) {
          e.preventDefault()
          onChange(opt.value)
          setOpen(false)
          triggerRef.current?.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, activeIdx, options, onChange])

  // Auto-scroll active option into view while open
  useEffect(() => {
    if (!open) return
    const el = optionRefs.current[activeIdx]
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [activeIdx, open])

  const select = useCallback(
    (opt: DropdownOption) => {
      if (opt.disabled) return
      onChange(opt.value)
      setOpen(false)
      triggerRef.current?.focus()
    },
    [onChange],
  )

  const selected = options.find(o => o.value === value)
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-[12.5px]' : 'px-3.5 py-2.5 text-[13.5px]'

  return (
    <div
      ref={rootRef}
      className={`group/drop relative ${width ?? ''} ${className}`}
      data-state={open ? 'open' : 'closed'}
    >
      {label && (
        <label
          htmlFor={`${id}-trigger`}
          className="mb-1.5 block text-[11.5px] font-medium uppercase tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        id={`${id}-trigger`}
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-2 rounded-xl text-left transition-all duration-200 ease-out ${sizeClass} ${
          open ? '' : 'hover:bg-hover'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-[0.99]'}`}
        style={{
          background: 'var(--bg-input)',
          color: 'var(--text-primary)',
          boxShadow: open
            ? 'inset 0 0 0 1.5px color-mix(in srgb, var(--color-primary) 55%, transparent), 0 0 0 4px color-mix(in srgb, var(--color-primary) 10%, transparent)'
            : 'inset 0 0 0 1px var(--border-color)',
        }}
      >
        <span className="flex min-w-0 items-center gap-2">
          {leadingIcon && (
            <span
              className="flex shrink-0 transition-colors duration-200 group-data-[state=open]/drop:text-brand"
              style={{ color: 'var(--text-muted)' }}
            >
              {leadingIcon}
            </span>
          )}
          <span
            className="truncate"
            style={selected ? undefined : { color: 'var(--text-muted)' }}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={size === 'sm' ? 13 : 15}
          strokeWidth={2.4}
          className={`shrink-0 transition-all duration-300 ease-out group-data-[state=open]/drop:rotate-180 group-data-[state=open]/drop:text-brand ${
            open ? 'rotate-180' : ''
          }`}
          style={{ color: open ? 'var(--color-primary)' : 'var(--text-muted)' }}
        />
      </button>

      {/* Panel — always mounted for smooth close transition */}
      <div
        id={`${id}-panel`}
        ref={panelRef}
        role="listbox"
        aria-labelledby={`${id}-trigger`}
        tabIndex={-1}
        className={`absolute left-0 right-auto z-50 mt-1.5 origin-top overflow-hidden rounded-xl border backdrop-blur-xl transition-all duration-200 ease-out ${
          width ?? 'min-w-[14rem]'
        } ${
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-1 scale-[0.98] opacity-0'
        }`}
        style={{
          background: 'color-mix(in srgb, var(--bg-elevated) 96%, transparent)',
          borderColor: 'var(--border-color)',
          boxShadow: '0 18px 40px -12px var(--shadow-3), 0 4px 8px -2px var(--shadow-1)',
        }}
      >
        <div className="max-h-72 overflow-y-auto p-1.5">
          {options.length === 0 && (
            <p className="px-3 py-3 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              Aucune option
            </p>
          )}
          {options.map((opt, i) => {
            const isSelected = opt.value === value
            const isActive = i === activeIdx
            return (
              <button
                key={opt.value}
                ref={el => {
                  optionRefs.current[i] = el
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                disabled={opt.disabled}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => select(opt)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 ${
                  opt.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                }`}
                style={{
                  background: isSelected
                    ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                    : isActive
                    ? 'var(--bg-hover)'
                    : 'transparent',
                  color: isSelected ? 'var(--color-primary)' : 'var(--text-primary)',
                }}
              >
                {opt.icon && (
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors"
                    style={{
                      background: isSelected
                        ? 'color-mix(in srgb, var(--color-primary) 18%, transparent)'
                        : 'var(--bg-hover)',
                      color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {opt.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium">{opt.label}</span>
                  {opt.description && (
                    <span
                      className="mt-0.5 block truncate text-[11px]"
                      style={{
                        color: isSelected
                          ? 'color-mix(in srgb, var(--color-primary) 75%, transparent)'
                          : 'var(--text-muted)',
                      }}
                    >
                      {opt.description}
                    </span>
                  )}
                </span>
                {opt.badge && <span className="shrink-0 text-[11px]">{opt.badge}</span>}
                {isSelected && (
                  <Check
                    size={14}
                    strokeWidth={2.6}
                    className="shrink-0"
                    style={{ color: 'var(--color-primary)' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
