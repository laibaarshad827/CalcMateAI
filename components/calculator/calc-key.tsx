import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type CalcKeyVariant = 'number' | 'operator' | 'function' | 'action' | 'equals'

const VARIANT_STYLES: Record<CalcKeyVariant, string> = {
  number: 'bg-secondary text-foreground hover:bg-accent text-lg',
  operator: 'bg-primary/12 text-primary hover:bg-primary/20 text-xl',
  function: 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground text-sm',
  action: 'bg-muted text-foreground hover:bg-accent text-sm',
  equals:
    'bg-gradient-to-br from-primary to-info text-primary-foreground text-xl shadow-lg shadow-primary/20 hover:brightness-110',
}

interface CalcKeyProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CalcKeyVariant
  label: string
  children: ReactNode
}

export function CalcKey({ variant = 'number', label, className, children, ...props }: CalcKeyProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'flex h-12 select-none items-center justify-center rounded-xl font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:pointer-events-none disabled:opacity-40 sm:h-14',
        VARIANT_STYLES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
