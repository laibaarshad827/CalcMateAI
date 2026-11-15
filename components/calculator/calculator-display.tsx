'use client'

import { Check, Copy, Loader2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useApp } from '@/components/app-provider'
import { toDisplay, tryPreview } from '@/lib/calculator-engine'
import { cn } from '@/lib/utils'

export function CalculatorDisplay() {
  const { calculator, settings } = useApp()
  const { expression, result, error, evaluated, pending } = calculator
  const [copied, setCopied] = useState(false)

  const preview = !evaluated && settings.engine === 'local' ? tryPreview(expression, settings.angleMode) : null
  const mainValue = evaluated ? result : preview
  const copyValue = evaluated ? result : preview

  async function copyResult() {
    if (!copyValue) return
    try {
      await navigator.clipboard.writeText(toDisplay(copyValue))
      setCopied(true)
      toast.success('Result copied to clipboard')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-muted/50 to-background/40 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/12 px-2 py-0.5 font-mono font-medium uppercase text-primary">
            {settings.angleMode}
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 font-medium">
            {settings.engine === 'local' ? 'Local engine' : 'Flask engine'}
          </span>
        </div>
        <button
          type="button"
          onClick={copyResult}
          disabled={!copyValue}
          aria-label="Copy result"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div
        className="mt-4 min-h-7 overflow-x-auto whitespace-nowrap text-right font-mono text-lg text-muted-foreground [scrollbar-width:none]"
        aria-label="Current expression"
      >
        {expression ? toDisplay(expression) : <span className="opacity-50">0</span>}
        {evaluated && <span className="opacity-70"> =</span>}
      </div>

      <output
        aria-live="polite"
        aria-label="Result"
        className={cn(
          'mt-1 flex min-h-14 items-center justify-end gap-2 overflow-x-auto whitespace-nowrap text-right font-mono text-4xl font-semibold tracking-tight [scrollbar-width:none] sm:text-5xl',
          evaluated ? 'text-foreground' : 'text-foreground/45',
        )}
      >
        {pending ? (
          <span className="flex items-center gap-2 text-base font-normal text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Calculating on Flask…
          </span>
        ) : error ? (
          <span className="flex items-center gap-2 text-base font-medium text-destructive">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {error}
          </span>
        ) : (
          toDisplay(mainValue ?? (expression ? '' : '0'))
        )}
      </output>
    </div>
  )
}
