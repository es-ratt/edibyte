import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-olive-100 bg-white p-5 shadow-soft sm:p-6 ${className}`} {...rest} />
}

export function CardTitle({ className = '', ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`mb-3 text-lg font-bold text-olive-900 ${className}`} {...rest} />
}
