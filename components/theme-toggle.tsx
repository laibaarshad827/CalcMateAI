'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle light and dark theme"
      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/80 transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <span className="flex items-center gap-3">
        <Sun className="size-4 dark:hidden" aria-hidden />
        <Moon className="hidden size-4 dark:block" aria-hidden />
        <span className="dark:hidden">Light mode</span>
        <span className="hidden dark:inline">Dark mode</span>
      </span>
      <span className="relative h-5 w-9 rounded-full bg-muted transition-colors dark:bg-primary" aria-hidden>
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-card shadow transition-transform dark:translate-x-4" />
      </span>
    </button>
  )
}
