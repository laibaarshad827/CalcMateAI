'use client'

import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AIAssistant } from '@/components/ai/ai-assistant'
import { useApp } from '@/components/app-provider'
import { BackendStatus } from '@/components/backend-status'
import { Calculator } from '@/components/calculator/calculator'
import { HistoryPanel } from '@/components/history/history-panel'
import { SettingsPanel } from '@/components/settings-panel'
import { Logo, NAV_ITEMS, Sidebar } from '@/components/sidebar'
import { Button } from '@/components/ui/button'
import type { View } from '@/lib/types'

const VIEW_COPY: Record<View, { title: string; description: string }> = {
  dashboard: {
    title: 'Welcome back',
    description: 'Crunch numbers, explore functions, or ask the AI assistant to walk you through a problem.',
  },
  standard: { title: 'Standard Calculator', description: 'Everyday arithmetic with percentages and parentheses.' },
  scientific: { title: 'Scientific Calculator', description: 'Trigonometry, logarithms, powers, roots and factorials.' },
  ai: { title: 'AI Math Assistant', description: 'Describe a problem in plain language and get a step-by-step solution.' },
  history: { title: 'Calculation History', description: 'Review, copy and reuse your previous calculations.' },
  settings: { title: 'Settings', description: 'Theme, calculator defaults and backend connection.' },
}

function ViewContent({ view }: { view: View }) {
  switch (view) {
    case 'dashboard':
      return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Calculator variant="scientific" />
          <div className="flex min-w-0 flex-col gap-4">
            <AIAssistant compact />
            <HistoryPanel limit={4} />
          </div>
        </div>
      )
    case 'standard':
      return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <Calculator variant="standard" />
          <HistoryPanel limit={8} className="lg:max-h-[42rem]" />
        </div>
      )
    case 'scientific':
      return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Calculator variant="scientific" />
          <HistoryPanel limit={8} className="xl:max-h-[42rem]" />
        </div>
      )
    case 'ai':
      return <AIAssistant className="h-[calc(100dvh-12rem)] min-h-[28rem]" />
    case 'history':
      return <HistoryPanel />
    case 'settings':
      return <SettingsPanel />
  }
}

export function AppShell() {
  const { view } = useApp()
  const [mobileOpen, setMobileOpen] = useState(false)
  const copy = VIEW_COPY[view]
  const navLabel = NAV_ITEMS.find((item) => item.view === view)?.label

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMobileOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-sidebar-border lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-sidebar-border shadow-2xl animate-in slide-in-from-left">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close navigation"
              className="absolute top-4 right-3"
              onClick={() => setMobileOpen(false)}
            >
              <X aria-hidden />
            </Button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
            <Menu aria-hidden />
          </Button>
          <Logo />
          <span className="w-8" aria-hidden />
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              {view !== 'dashboard' && (
                <p className="text-xs font-medium uppercase tracking-wider text-primary">{navLabel}</p>
              )}
              <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {view === 'dashboard' ? (
                  <>
                    {copy.title} to{' '}
                    <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">CalcMate AI</span>
                  </>
                ) : (
                  copy.title
                )}
              </h1>
              <p className="text-pretty text-sm text-muted-foreground">{copy.description}</p>
            </div>
            <BackendStatus />
          </div>

          <ViewContent view={view} />
        </main>
      </div>
    </div>
  )
}
