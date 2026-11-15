'use client'

import { Keyboard } from 'lucide-react'
import { useEffect, useEffectEvent } from 'react'
import { useApp } from '@/components/app-provider'
import { cn } from '@/lib/utils'
import { CalculatorDisplay } from './calculator-display'
import { CalculatorKeypad } from './calculator-keypad'
import { ScientificPanel } from './scientific-panel'

const OPERATORS: Record<string, string> = { '+': '+', '-': '-', '*': '*', x: '*', '/': '/', '^': '^' }

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function Calculator({ variant, className }: { variant: 'standard' | 'scientific'; className?: string }) {
  const { input, backspace, clear, evaluate } = useApp()

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return
    const { key } = event
    let handled = true

    if (/^[0-9.]$/.test(key)) input(key, 'operand')
    else if (key in OPERATORS) input(OPERATORS[key], 'operator')
    else if (key === '(') input('(', 'operand')
    else if (key === ')' || key === '%' || key === '!') input(key, 'postfix')
    else if (key === 'Enter' || key === '=') void evaluate()
    else if (key === 'Backspace') backspace()
    else if (key === 'Escape' || key === 'Delete') clear()
    else handled = false

    if (handled) event.preventDefault()
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  return (
    <section
      aria-label={variant === 'scientific' ? 'Scientific calculator' : 'Standard calculator'}
      className={cn('flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-xl shadow-black/5 sm:p-5', className)}
    >
      <CalculatorDisplay />
      <div className={cn('grid gap-4', variant === 'scientific' && 'md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]')}>
        {variant === 'scientific' && <ScientificPanel />}
        <CalculatorKeypad />
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Keyboard className="size-3.5 shrink-0" aria-hidden />
        <span>
          Keyboard ready: digits, + − × ÷ ^ ( ) % !, Enter to evaluate, Backspace to delete, Esc to clear.
        </span>
      </p>
    </section>
  )
}
