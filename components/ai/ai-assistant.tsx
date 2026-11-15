'use client'

import { ArrowUp, Eraser, Maximize2, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/components/app-provider'
import { BackendStatus } from '@/components/backend-status'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AIResponse } from './ai-response'

const SUGGESTIONS = [
  'What is 15% of 2000?',
  'Split 8500 between 4 people.',
  'Solve 2x + 5 = 15.',
  'Calculate compound interest on 10000 at 5% for 3 years.',
]

export function AIAssistant({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { exchanges, ask, retry, clearConversation, setView } = useApp()
  const [question, setQuestion] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const isLoading = exchanges.some((ex) => ex.status === 'loading')
  const visible = compact ? exchanges.slice(-1) : exchanges

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [exchanges])

  function submit(text = question) {
    if (!text.trim() || isLoading) return
    setQuestion('')
    void ask(text)
  }

  return (
    <section
      aria-label="AI math assistant"
      className={cn('flex min-h-0 flex-col rounded-3xl border border-border bg-card shadow-xl shadow-black/5', className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info text-primary-foreground">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold">AI Math Assistant</h2>
            <p className="text-xs text-muted-foreground">Ask in plain language, get worked solutions</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!compact && <BackendStatus />}
          {exchanges.length > 0 && !compact && (
            <Button variant="ghost" size="sm" onClick={clearConversation}>
              <Eraser aria-hidden />
              Clear
            </Button>
          )}
          {compact && (
            <Button variant="ghost" size="icon-sm" aria-label="Open full assistant" onClick={() => setView('ai')}>
              <Maximize2 aria-hidden />
            </Button>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        className={cn('flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-5', compact ? 'max-h-96' : '')}
        aria-live="polite"
      >
        {visible.length === 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Try one of these</p>
              <p className="text-xs text-muted-foreground">
                Answers come from the CalcMate Flask backend. Nothing is generated in the browser.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submit(suggestion)}
                  disabled={isLoading}
                  className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          visible.map((exchange) => (
            <AIResponse key={exchange.id} exchange={exchange} onRetry={() => void retry(exchange.id)} />
          ))
        )}
      </div>

      <form
        className="border-t border-border p-3 sm:p-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-background/60 p-2 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20">
          <label htmlFor={compact ? 'ai-question-compact' : 'ai-question'} className="sr-only">
            Describe your math problem
          </label>
          <textarea
            id={compact ? 'ai-question-compact' : 'ai-question'}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                if (event.nativeEvent.isComposing || event.keyCode === 229) return
                event.preventDefault()
                submit()
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder="e.g. Solve 3x − 7 = 11"
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="icon" aria-label="Send question" disabled={!question.trim() || isLoading}>
            <ArrowUp aria-hidden />
          </Button>
        </div>
      </form>
    </section>
  )
}
