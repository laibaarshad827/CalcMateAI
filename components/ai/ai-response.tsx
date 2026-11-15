'use client'

import { Copy, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { AIExchange } from '@/lib/types'

export function AIResponse({ exchange, onRetry }: { exchange: AIExchange; onRetry: () => void }) {
  return (
    <article className="flex flex-col gap-3" aria-busy={exchange.status === 'loading'}>
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        {exchange.question}
      </div>

      {exchange.status === 'loading' && (
        <div className="flex flex-col gap-3 rounded-2xl rounded-bl-md border border-border bg-muted/40 p-4" role="status">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 animate-pulse text-primary" aria-hidden />
            Solving step by step…
          </div>
          <div className="flex flex-col gap-2" aria-hidden>
            <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      )}

      {exchange.status === 'error' && (
        <div className="flex flex-col gap-3 rounded-2xl rounded-bl-md border border-destructive/30 bg-destructive/10 p-4" role="alert">
          <div className="flex items-start gap-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="font-medium text-foreground">The AI assistant could not answer</p>
              <p className="text-muted-foreground">{exchange.error}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="self-start" onClick={onRetry}>
            <RotateCcw aria-hidden />
            Try again
          </Button>
        </div>
      )}

      {exchange.status === 'success' && (
        <div className="flex flex-col gap-4 rounded-2xl rounded-bl-md border border-border bg-muted/40 p-4">
          {exchange.solution.steps.length > 0 && (
            <ol className="flex flex-col gap-3">
              {exchange.solution.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1 text-sm">
                    {step.title && <p className="font-medium text-foreground">{step.title}</p>}
                    {step.content && <p className="leading-relaxed text-muted-foreground">{step.content}</p>}
                    {step.expression && (
                      <code className="w-fit max-w-full overflow-x-auto rounded-md bg-background px-2 py-1 font-mono text-xs text-foreground">
                        {step.expression}
                      </code>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 to-info/10 p-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-xs font-medium uppercase tracking-wide text-primary">Final answer</span>
              <span className="break-words font-mono text-lg font-semibold text-foreground">
                {exchange.solution.finalAnswer}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Copy final answer"
              onClick={() =>
                navigator.clipboard
                  .writeText(exchange.solution.finalAnswer)
                  .then(() => toast.success('Answer copied'))
                  .catch(() => toast.error('Could not copy to clipboard'))
              }
            >
              <Copy aria-hidden />
            </Button>
          </div>

          {exchange.solution.explanation && (
            <p className="text-sm leading-relaxed text-muted-foreground">{exchange.solution.explanation}</p>
          )}
          {exchange.solution.model && (
            <p className="text-xs text-muted-foreground">Answered by {exchange.solution.model}</p>
          )}
        </div>
      )}
    </article>
  )
}
