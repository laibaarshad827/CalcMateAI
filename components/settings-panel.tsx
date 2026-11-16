'use client'

import { Loader2, PlugZap } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useApp } from '@/components/app-provider'
import { Button } from '@/components/ui/button'
import { api, API_ENDPOINTS, DEFAULT_API_BASE_URL, getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

function Card({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/5">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T | undefined
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground" id={`seg-${label}`}>
        {label}
      </span>
      <div className="flex rounded-xl bg-muted/60 p-1" role="radiogroup" aria-labelledby={`seg-${label}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              value === option.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SettingsPanel() {
  const { settings, updateSettings, clearHistory } = useApp()
  const { theme, setTheme } = useTheme()
  const [urlDraft, setUrlDraft] = useState(settings.apiBaseUrl)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    setUrlDraft(settings.apiBaseUrl)
  }, [settings.apiBaseUrl])

  async function testConnection() {
    setTesting(true)
    try {
      const data = await api.health(urlDraft)
      toast.success('Backend is reachable', { description: `Status: ${data.status}` })
    } catch (error) {
      toast.error('Backend unreachable', { description: getErrorMessage(error) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Appearance" description="Choose how CalcMate AI looks on this device.">
        <Segmented
          label="Theme"
          value={theme as 'light' | 'dark' | 'system' | undefined}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
          onChange={setTheme}
        />
      </Card>

      <Card title="Calculator" description="Defaults for evaluating expressions.">
        <Segmented
          label="Angle unit"
          value={settings.angleMode}
          options={[
            { value: 'deg', label: 'Degrees' },
            { value: 'rad', label: 'Radians' },
          ]}
          onChange={(angleMode) => updateSettings({ angleMode })}
        />
        <Segmented
          label="Calculation engine"
          value={settings.engine}
          options={[
            { value: 'local', label: 'In browser' },
            { value: 'backend', label: 'Flask API' },
          ]}
          onChange={(engine) => updateSettings({ engine })}
        />
        <p className="text-xs text-muted-foreground">
          Flask API sends each expression to <code className="font-mono">{API_ENDPOINTS.calculate.path}</code>. The
          in-browser engine works offline.
        </p>
      </Card>

      <Card title="Backend connection" description="Where the Flask server is running.">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const value = urlDraft.trim().replace(/\/+$/, '')
            try {
              new URL(value)
            } catch {
              toast.error('Enter a valid URL, e.g. http://localhost:5000')
              return
            }
            updateSettings({ apiBaseUrl: value })
            setUrlDraft(value)
            toast.success('API base URL saved for this session')
          }}
        >
          <label htmlFor="api-url" className="text-sm text-muted-foreground">
            API base URL
          </label>
          <input
            id="api-url"
            type="url"
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.target.value)}
            className="h-10 rounded-xl border border-input bg-background/60 px-3 font-mono text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="outline" onClick={testConnection} disabled={testing}>
              {testing ? <Loader2 className="animate-spin" aria-hidden /> : <PlugZap aria-hidden />}
              Test connection
            </Button>
            <Button type="button" variant="ghost" onClick={() => setUrlDraft(DEFAULT_API_BASE_URL)}>
              Reset
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Default comes from <code className="font-mono">NEXT_PUBLIC_API_BASE_URL</code>, falling back to{' '}
            <code className="font-mono">http://localhost:5000</code>.
          </p>
        </form>
      </Card>

      <Card title="Endpoints & data" description="The contract this frontend expects from Flask.">
        <ul className="flex flex-col gap-2">
          {Object.values(API_ENDPOINTS).map((endpoint) => (
            <li key={endpoint.path} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 font-mono text-xs">
              <span
                className={cn(
                  'w-11 rounded px-1.5 py-0.5 text-center font-semibold',
                  endpoint.method === 'GET' ? 'bg-success/15 text-success' : 'bg-info/15 text-info',
                )}
              >
                {endpoint.method}
              </span>
              <span>{endpoint.path}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <label htmlFor="show-samples" className="text-sm text-muted-foreground">
            Show sample history entries
          </label>
          <input
            id="show-samples"
            type="checkbox"
            checked={settings.showSampleHistory}
            onChange={(event) => updateSettings({ showSampleHistory: event.target.checked })}
            className="size-4 accent-primary"
          />
        </div>
        <Button
          variant="destructive"
          className="self-start"
          onClick={() => {
            clearHistory()
            toast.success('History cleared')
          }}
        >
          Clear all history
        </Button>
      </Card>
    </div>
  )
}
