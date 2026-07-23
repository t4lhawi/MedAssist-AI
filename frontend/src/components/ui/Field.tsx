import React, { forwardRef, useId, useState } from 'react'
import { AlertCircle, Check, Eye, EyeOff, X } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
 *  Field — shared input/select/textarea wrapper
 *
 *  A single "filled Material-style" control used by Esp32Form,
 *  UnregisteredList, DocumentsManager and other forms. The native
 *  `<select>` keeps browser-native dropdown but the trigger is
 *  restyled to match the rest of the app.
 *
 *  Variants:
 *   - "default" (slate-50 background, blue focus ring)
 *   - "ghost"   (transparent background, used inside the chat input)
 *   - "amber"   (warning context — used by UnregisteredList)
 * ───────────────────────────────────────────────────────────── */

export type FieldVariant = 'default' | 'ghost' | 'amber'
export type FieldSize = 'sm' | 'md'

const VARIANT_RING: Record<FieldVariant, { idle: string; focus: string; error: string }> = {
  default: {
    idle: 'shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]',
    focus: 'shadow-[inset_0_0_0_1.5px_rgba(46,99,255,0.55),0_0_0_4px_rgba(46,99,255,0.08)]',
    error: 'shadow-[inset_0_0_0_1.5px_rgba(220,38,38,0.6),0_0_0_4px_rgba(220,38,38,0.08)]',
  },
  ghost: {
    idle: 'shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]',
    focus: 'shadow-[inset_0_0_0_1.5px_rgba(46,99,255,0.5),0_0_0_4px_rgba(46,99,255,0.06)]',
    error: 'shadow-[inset_0_0_0_1.5px_rgba(220,38,38,0.6)]',
  },
  amber: {
    idle: 'shadow-[inset_0_0_0_1px_rgba(180,83,9,0.18)]',
    focus: 'shadow-[inset_0_0_0_1.5px_rgba(217,119,6,0.55),0_0_0_4px_rgba(217,119,6,0.08)]',
    error: 'shadow-[inset_0_0_0_1.5px_rgba(220,38,38,0.6)]',
  },
}

const SIZE_PADDING: Record<FieldSize, string> = {
  sm: 'px-3 py-1.5 text-[12.5px]',
  md: 'px-3.5 py-2.5 text-[13.5px]',
}

interface FieldShellProps {
  variant?: FieldVariant
  size?: FieldSize
  hasError?: boolean
  disabled?: boolean
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
  onClear?: () => void
  children: React.ReactNode
  className?: string
}

/** Visual shell shared by every Field sub-component. */
export const FieldShell = forwardRef<HTMLDivElement, FieldShellProps>(function FieldShell(
  { variant = 'default', size = 'md', hasError, disabled, leadingIcon, trailingIcon, onClear, children, className = '' },
  ref,
) {
  const rings = VARIANT_RING[variant]
  const idleRing = rings.idle

  return (
    <div
      ref={ref}
      data-variant={variant}
      data-error={hasError ? 'true' : 'false'}
      className={`group/field relative flex items-center gap-2 rounded-xl bg-white transition-all duration-200 ease-out ${SIZE_PADDING[size]} ${idleRing} ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
    >
      {leadingIcon && (
        <span className="pointer-events-none flex shrink-0 text-slate-400 transition-colors duration-200 group-focus-within/field:text-blue-500">
          {leadingIcon}
        </span>
      )}
      <div className="relative min-w-0 flex-1">{children}</div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="Effacer"
          tabIndex={-1}
        >
          <X size={12} strokeWidth={2.4} />
        </button>
      )}
      {trailingIcon && (
        <span className="flex shrink-0 text-slate-400 transition-colors duration-200 group-focus-within/field:text-blue-500">
          {trailingIcon}
        </span>
      )}
    </div>
  )
})

/* ─────────────────────────────────────────────────────────────
 *  TextField — labeled text input with optional leading icon,
 *  error message, success indicator and clear button.
 *  Mirrors the "Material outlined" pattern with a static label
 *  (no floating animation) to keep things predictable.
 * ───────────────────────────────────────────────────────────── */

interface TextFieldProps {
  label?: string
  hint?: string
  error?: string | null
  success?: boolean
  leadingIcon?: React.ReactNode
  trailingAdornment?: React.ReactNode
  variant?: FieldVariant
  fieldSize?: FieldSize
  clearable?: boolean
  className?: string
  inputClassName?: string
  containerClassName?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps & React.InputHTMLAttributes<HTMLInputElement>>(
  function TextField(
    { label, hint, error, success, leadingIcon, trailingAdornment, variant = 'default', fieldSize = 'md', clearable, className = '', inputClassName = '', containerClassName = '', ...inputProps },
    ref,
  ) {
    const [showPw, setShowPw] = useState(false)
    const isPassword = inputProps.type === 'password'
    const effectiveType = isPassword && showPw ? 'text' : inputProps.type
    const id = useId()

    const trailing = isPassword ? (
      <button
        type="button"
        onClick={() => setShowPw(v => !v)}
        className="flex h-6 w-6 items-center justify-center text-slate-400 transition-colors hover:text-slate-600"
        tabIndex={-1}
        title={showPw ? 'Masquer' : 'Afficher'}
      >
        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    ) : (
      trailingAdornment
    )

    const showClear = clearable && !!inputProps.value && !inputProps.disabled

    return (
      <label htmlFor={id} className={`block ${containerClassName}`}>
        {label && (
          <span className="mb-1.5 flex items-center justify-between text-[11.5px] font-medium uppercase tracking-wide text-slate-500">
            {label}
            {success && <Check size={12} className="text-emerald-500" strokeWidth={2.6} />}
          </span>
        )}
        <FieldShell
          variant={variant}
          size={fieldSize}
          hasError={!!error}
          disabled={inputProps.disabled}
          leadingIcon={leadingIcon}
          trailingIcon={trailing}
          onClear={showClear ? () => inputProps.onChange?.({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>) : undefined}
          className={className}
        >
          <input
            ref={ref}
            id={id}
            {...inputProps}
            type={effectiveType}
            className={`w-full border-0 bg-transparent p-0 text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${inputClassName}`}
          />
        </FieldShell>
        {(error || hint) && (
          <p className={`mt-1.5 flex items-start gap-1 text-[11.5px] ${error ? 'font-medium text-red-600' : 'text-slate-400'}`}>
            {error ? (
              <>
                <AlertCircle size={11} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </>
            ) : (
              <span>{hint}</span>
            )}
          </p>
        )}
      </label>
    )
  },
)

/* ─────────────────────────────────────────────────────────────
 *  SelectField — labeled native `<select>` with a custom chevron.
 *  We use the native dropdown (accessibility + a11y for free) but
 *  restyle the trigger to match the rest of the app.
 * ───────────────────────────────────────────────────────────── */

interface SelectFieldProps {
  label?: string
  hint?: string
  error?: string | null
  variant?: FieldVariant
  fieldSize?: FieldSize
  className?: string
  children: React.ReactNode
  value?: string | number
  onChange?: React.ChangeEventHandler<HTMLSelectElement>
}

export function SelectField({
  label,
  hint,
  error,
  variant = 'default',
  fieldSize = 'md',
  className = '',
  children,
  ...selectProps
}: SelectFieldProps) {
  const id = useId()
  return (
    <div className={`block ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-[11.5px] font-medium uppercase tracking-wide text-slate-500"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <FieldShell variant={variant} size={fieldSize} hasError={!!error}>
          <select
            id={id}
            {...selectProps}
            className="w-full appearance-none border-0 bg-transparent p-0 pr-7 text-slate-900 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            {children}
          </select>
        </FieldShell>
        {/* Custom chevron */}
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform duration-200 group-focus-within/field:rotate-180 group-focus-within/field:text-blue-500"
        >
          <path
            d="M5 7.5l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {(error || hint) && (
        <p className={`mt-1.5 text-[11.5px] ${error ? 'font-medium text-red-600' : 'text-slate-400'}`}>
          {error || hint}
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
 *  SearchField — labeled search input with a magnifier icon and
 *  an X clear button. Used in filter bars and side panels.
 * ───────────────────────────────────────────────────────────── */

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  variant?: FieldVariant
  fieldSize?: FieldSize
  autoFocus?: boolean
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Rechercher…',
  className = '',
  variant = 'ghost',
  fieldSize = 'sm',
  autoFocus,
}: SearchFieldProps) {
  return (
    <FieldShell
      variant={variant}
      size={fieldSize}
      leadingIcon={
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 3 3" />
        </svg>
      }
      onClear={value ? () => onChange('') : undefined}
      className={className}
    >
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full border-0 bg-transparent p-0 text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </FieldShell>
  )
}