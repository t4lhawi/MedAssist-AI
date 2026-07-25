import React, { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function Select({ options, value, onChange, placeholder = 'Sélectionner' }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] transition-colors ${
          open ? '' : 'hover:bg-hover'
        }`}
        style={{
          background: 'var(--bg-card)',
          borderColor: open ? 'var(--color-primary)' : 'var(--border-color)',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-muted)' }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 origin-top animate-[selectIn_0.12s_ease-out] overflow-auto rounded-xl border p-1.5 backdrop-blur-xl"
          style={{
            background: 'color-mix(in srgb, var(--bg-elevated) 96%, transparent)',
            borderColor: 'var(--border-color)',
            boxShadow: '0 10px 30px -8px var(--shadow-3)',
          }}
        >
          {options.length === 0 && (
            <p className="px-3 py-2.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Aucune option
            </p>
          )}
          {options.map(opt => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition-colors"
                style={{
                  background: isSelected
                    ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                    : 'transparent',
                  color: isSelected ? 'var(--color-primary)' : 'var(--text-primary)',
                  fontWeight: isSelected ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={15} strokeWidth={2.4} className="shrink-0" style={{ color: 'var(--color-primary)' }} />}
              </button>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes selectIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
