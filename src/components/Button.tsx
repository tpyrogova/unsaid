import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-clay px-7 py-3.5 font-medium text-card hover:bg-clay-deep',
  secondary: 'border border-line bg-card px-6 py-3 font-medium hover:border-clay/50',
  ghost: '-ml-2 px-2 py-1 text-sm text-ink-soft hover:text-ink',
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-full transition-colors focus-visible:ring-4 focus-visible:ring-clay/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
