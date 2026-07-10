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
        className={`flex w-full items-center justify-between gap-2 rounded-xl bg-slate-100 px-3.5 py-2.5 text-left text-[13.5px] transition-shadow ${
          open ? 'bg-white shadow-[inset_0_0_0_1.5px_rgba(37,99,235,0.5)]' : 'hover:bg-slate-100/80'
        }`}
      >
        <span className={selected ? 'truncate text-slate-800' : 'truncate text-slate-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 origin-top animate-[selectIn_0.12s_ease-out] overflow-auto rounded-2xl border border-black/5 bg-white/95 p-1.5 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          {options.length === 0 && (
            <p className="px-3 py-2.5 text-[13px] text-slate-400">Aucune option</p>
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
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition-colors ${
                  isSelected ? 'bg-blue-50 font-medium text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={15} strokeWidth={2.4} className="shrink-0 text-blue-600" />}
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