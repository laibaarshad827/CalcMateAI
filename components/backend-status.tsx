'use client'

import { RefreshCw } from 'lucide-react'
import { useApp } from '@/components/app-provider'
import { useBackendHealth } from '@/hooks/use-backend-health'
import { cn } from '@/lib/utils'

const LABELS = { checking: 'Checking backend', online: 'Flask backend online', offline: 'Flask backend offline' }

export function BackendStatus({ className }: { className?: string }) {
  const { settings } = useApp()
  const { status, data, isValidating, recheck } = useBackendHealth(settings.apiBaseUrl)
  const missingKey = status === 'online' && data?.gemini_configured === false
  const label = missingKey ? 'Flask online · Add Gemini key' : LABELS[status]

  return (
    <button
      type="button"
      onClick={recheck}
      title={`${label} — ${settings.apiBaseUrl}. Click to re-check.`}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          status === 'online' && !missingKey && 'bg-success shadow-[0_0_8px] shadow-success',
          missingKey && 'bg-amber-500',
          status === 'offline' && 'bg-destructive',
          status === 'checking' && 'animate-pulse bg-muted-foreground',
        )}
      />
      <span>{label}</span>
      <RefreshCw className={cn('size-3', isValidating && 'animate-spin')} aria-hidden />
    </button>
  )
}
