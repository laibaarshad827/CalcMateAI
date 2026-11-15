'use client'

import { Copy, History, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '@/components/app-provider'
import { Button } from '@/components/ui/button'
import { toDisplay } from '@/lib/calculator-engine'
import type { HistoryItem } from '@/lib/types'
import { cn } from '@/lib/utils'

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const SOURCE_BADGE: Record<HistoryItem['source'], { label: string; className: string }> = {
  local: { label: 'Local', className: 'bg-primary/12 text-primary' },
  backend: { label: 'Flask', className: 'bg-info/15 text-info' },
  sample: { label: 'Sample', className: 'border border-dashed border-border text-muted-foreground' },
}

export function HistoryPanel({ limit, className }: { limit?: number; className?: string }) {
  const { history, clearHistory, loadExpression, view, setView } = useApp()
  const items = limit ? history.slice(0, limit) : history
  const hasSamples = items.some((item) => item.source === 'sample')

  function reuse(item: HistoryItem) {
    loadExpression(item.expression)
    if (view === 'history') setView('scientific')
    toast.success('Expression loaded into the calculator')
  }

  return (
    <section
      aria-label="Calculation history"
      className={cn('flex min-h-0 flex-col rounded-3xl border border-border bg-card shadow-xl shadow-black/5', className)}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <History className="size-4" aria-hidden />
          </span>
          <h2 className="text-sm font-semibold">Calculation History</h2>
        </div>
        <div className="flex items-center gap-1">
          {limit && history.length > limit && (
            <Button variant="ghost" size="sm" onClick={() => setView('history')}>
              View all
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={history.length === 0}
            onClick={() => {
              clearHistory()
              toast.success('History cleared')
            }}
          >
            <Trash2 aria-hidden />
            Clear
          </Button>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <History className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-medium">No calculations yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Evaluate an expression with = or Enter and it will appear here for quick reuse.
          </p>
        </div>
      ) : (
        <>
          {hasSamples && (
            <p className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground sm:px-5">
              Entries marked Sample are preview data, not your saved calculations.
            </p>
          )}
          <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {items.map((item) => (
              <li
                key={item.id}
                className="group flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:px-5"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-mono text-xs text-muted-foreground">{toDisplay(item.expression)}</span>
                  <span className="truncate font-mono text-base font-semibold">= {toDisplay(item.result)}</span>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className={cn('rounded px-1.5 py-px font-medium', SOURCE_BADGE[item.source].className)}>
                      {SOURCE_BADGE[item.source].label}
                    </span>
                    <time dateTime={new Date(item.timestamp).toISOString()} suppressHydrationWarning>
                      {timeFormatter.format(item.timestamp)}
                    </time>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Copy result ${item.result}`}
                    onClick={() =>
                      navigator.clipboard
                        .writeText(toDisplay(item.result))
                        .then(() => toast.success('Result copied'))
                        .catch(() => toast.error('Could not copy to clipboard'))
                    }
                  >
                    <Copy aria-hidden />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Reuse ${toDisplay(item.expression)}`}
                    onClick={() => reuse(item)}
                  >
                    <RotateCcw aria-hidden />
                    Reuse
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
