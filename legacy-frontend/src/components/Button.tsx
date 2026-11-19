import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

// One primary (filled olive) and one outline style, both at least 44px tall.
type Variant = 'primary' | 'outline' | 'ghost'

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-semibold transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-50 select-none'
const styles: Record<Variant, string> = {
  primary: 'bg-olive-700 text-white hover:bg-olive-900 shadow-soft',
  outline: 'border-2 border-olive-700 text-olive-700 bg-white hover:bg-olive-50',
  ghost: 'text-olive-700 hover:bg-olive-100',
}

export function buttonClass(variant: Variant = 'primary', extra = '') {
  return `${base} ${styles[variant]} ${extra}`
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
  ref?: Ref<HTMLButtonElement> // React 19: ref is a plain prop
}

export function Button({ variant = 'primary', icon, className = '', children, type = 'button', ...rest }: Props) {
  return (
    <button type={type} className={buttonClass(variant, className)} {...rest}>
      {icon}
      {children}
    </button>
  )
}

export function ButtonLink({ variant = 'primary', className = '', children, ...rest }: LinkProps & { variant?: Variant }) {
  return (
    <Link className={buttonClass(variant, className)} {...rest}>
      {children}
    </Link>
  )
}
