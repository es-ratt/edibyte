import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
}

/** Tappable pill. With `selected` it acts as a toggle (aria-pressed). */
export function Chip({ selected, className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      aria-pressed={selected === undefined ? undefined : selected}
      className={
        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ' +
        (selected
          ? 'border-olive-700 bg-olive-700 text-white'
          : 'border-olive-200 bg-olive-50 text-olive-900 hover:border-olive-500 hover:bg-olive-100') +
        ` ${className}`
      }
      {...rest}
    />
  )
}
