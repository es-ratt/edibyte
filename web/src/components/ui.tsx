// Small shared UI primitives. 48 px minimum tap targets, 20 px rounded cards, visible focus.
// Meaning is never carried by colour alone: chips always pair an icon with text.

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-olive-700 text-white hover:bg-olive-900',
  secondary: 'bg-surface text-olive-900 border border-olive-200 hover:bg-olive-50',
  ghost: 'text-olive-700 hover:bg-olive-50',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  block?: boolean
}

export function Button({ variant = 'primary', block = false, className = '', ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-tap items-center justify-center gap-2 rounded-2xl px-5 font-semibold transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  )
}

type CardProps = {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article'
  labelledBy?: string
}

export function Card({ children, className = '', as: Tag = 'div', labelledBy }: CardProps) {
  return (
    <Tag aria-labelledby={labelledBy} className={`rounded-card bg-surface p-5 shadow-card ${className}`}>
      {children}
    </Tag>
  )
}

export type ChipTone = 'neutral' | 'olive' | 'amber' | 'terracotta'

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: 'bg-olive-50 text-ink border-line',
  olive: 'bg-olive-100 text-olive-900 border-olive-200',
  amber: 'bg-mustard-100 text-amber-ink border-mustard',
  terracotta: 'bg-terracotta-50 text-terracotta border-terracotta',
}

type ChipProps = {
  icon: LucideIcon
  children: ReactNode
  tone?: ChipTone
}

export function Chip({ icon: Icon, children, tone = 'neutral' }: ChipProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-medium ${CHIP_TONES[tone]}`}>
      <Icon size={14} aria-hidden />
      {children}
    </span>
  )
}

type PageTitleProps = {
  children: ReactNode
  id?: string
}

export function PageTitle({ children, id }: PageTitleProps) {
  return (
    <h1 id={id} className="mb-4 text-2xl font-semibold text-olive-900">
      {children}
    </h1>
  )
}
