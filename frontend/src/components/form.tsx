// Accessible form controls: native inputs inside labelled fieldsets, 48 px targets, visible focus.

import type { ReactNode } from 'react'

type OptionGroupProps<T extends string | number> = {
  legend: string
  name: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  label: (option: T) => string
  hint?: (option: T) => string
  columns?: 1 | 2 | 3
}

export function OptionGroup<T extends string | number>({ legend, name, options, value, onChange, label, hint, columns = 1 }: OptionGroupProps<T>) {
  const grid = columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1'
  return (
    <fieldset>
      <legend className="mb-2 font-semibold text-olive-900">{legend}</legend>
      <div className={`grid gap-2 ${grid}`}>
        {options.map((o) => {
          const checked = o === value
          return (
            <label
              key={String(o)}
              className={`flex min-h-tap cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-olive-700 ${
                checked ? 'border-olive-700 bg-olive-50' : 'border-line bg-surface'
              }`}
            >
              <input type="radio" name={name} checked={checked} onChange={() => onChange(o)} className="mt-1 size-5 shrink-0 accent-olive-700" />
              <span>
                <span className="block font-medium text-ink">{label(o)}</span>
                {hint && <span className="block text-sm text-muted">{hint(o)}</span>}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

type CheckGroupProps<T extends string> = {
  legend: string
  options: readonly T[]
  values: readonly T[]
  onChange: (values: T[]) => void
  label: (option: T) => string
  note?: ReactNode
}

export function CheckGroup<T extends string>({ legend, options, values, onChange, label, note }: CheckGroupProps<T>) {
  const toggle = (o: T) => onChange(values.includes(o) ? values.filter((v) => v !== o) : [...values, o])
  return (
    <fieldset>
      <legend className="mb-2 font-semibold text-olive-900">{legend}</legend>
      {note}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = values.includes(o)
          return (
            <label
              key={o}
              className={`inline-flex min-h-tap cursor-pointer items-center gap-2 rounded-full border px-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-olive-700 ${
                checked ? 'border-olive-700 bg-olive-50 text-olive-900' : 'border-line bg-surface text-ink'
              }`}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(o)} className="size-5 accent-olive-700" />
              {label(o)}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

type SwitchRowProps = {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function SwitchRow({ label, hint, checked, disabled = false, onChange }: SwitchRowProps) {
  return (
    <label className={`flex min-h-tap items-center justify-between gap-4 py-2 ${disabled ? 'opacity-70' : 'cursor-pointer'}`}>
      <span>
        <span className="block font-semibold text-olive-900">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-6 shrink-0 accent-olive-700"
      />
    </label>
  )
}

type FieldProps = {
  id: string
  label: string
  error?: string | null
  hint?: string
  children: ReactNode
}

/** Label + control + hint/error, linked with aria-describedby by the caller via `${id}-msg`. */
export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-semibold text-olive-900">
        {label}
      </label>
      {children}
      {(error || hint) && (
        // Errors are bold ink, not terracotta: terracotta is reserved for allergy/medical notices.
        <p id={`${id}-msg`} className={`mt-1 text-sm ${error ? 'font-semibold text-ink' : 'text-muted'}`} role={error ? 'alert' : undefined}>
          {error || hint}
        </p>
      )}
    </div>
  )
}

export const inputClass =
  'block min-h-tap w-full rounded-2xl border border-line bg-surface px-4 text-ink focus-visible:outline-3 focus-visible:outline-olive-700'
