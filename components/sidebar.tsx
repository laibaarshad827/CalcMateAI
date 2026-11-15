'use client'

import { Calculator, FlaskConical, History, LayoutDashboard, Settings, Sparkles, Sigma } from 'lucide-react'
import { useApp } from '@/components/app-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import type { View } from '@/lib/types'
import { cn } from '@/lib/utils'

export const NAV_ITEMS: { view: View; label: string; icon: typeof Calculator }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'standard', label: 'Standard Calculator', icon: Calculator },
  { view: 'scientific', label: 'Scientific Calculator', icon: FlaskConical },
  { view: 'ai', label: 'AI Math Assistant', icon: Sparkles },
  { view: 'history', label: 'Calculation History', icon: History },
  { view: 'settings', label: 'Settings', icon: Settings },
]

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground shadow-lg shadow-primary/25">
        <Sigma className="size-5" aria-hidden />
      </span>
      <span className="text-base font-semibold tracking-tight">
        CalcMate <span className="text-primary">AI</span>
      </span>
    </div>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView, history } = useApp()
  const savedCount = history.filter((item) => item.source !== 'sample').length

  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground">
      <div className="px-2 pt-1">
        <Logo />
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ view: itemView, label, icon: Icon }) => {
          const active = view === itemView
          return (
            <button
              key={itemView}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                setView(itemView)
                onNavigate?.()
              }}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                active
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <Icon className={cn('size-4 shrink-0', active && 'text-sidebar-primary')} aria-hidden />
              <span className="flex-1">{label}</span>
              {itemView === 'history' && savedCount > 0 && (
                <span className="rounded-full bg-sidebar-primary/15 px-2 py-0.5 font-mono text-[11px] text-sidebar-primary">
                  {savedCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-sidebar-border pt-4">
        <ThemeToggle />
        <p className="px-3 text-[11px] text-muted-foreground">Flask + Gemini ready frontend</p>
      </div>
    </div>
  )
}
