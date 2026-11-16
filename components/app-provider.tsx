'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { api, DEFAULT_API_BASE_URL, getErrorMessage } from '@/lib/api'
import {
  CalcError,
  evaluateExpression,
  formatResult,
  removeLastToken,
  toBackendExpression,
} from '@/lib/calculator-engine'
import { SAMPLE_HISTORY } from '@/lib/sample-history'
import type { AIExchange, HistoryItem, Settings, View } from '@/lib/types'

export type KeyKind = 'operand' | 'operator' | 'postfix'

interface CalculatorState {
  expression: string
  result: string | null
  error: string | null
  evaluated: boolean
  pending: boolean
}

interface AppContextValue {
  view: View
  setView: (view: View) => void
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void

  calculator: CalculatorState
  input: (value: string, kind: KeyKind) => void
  backspace: () => void
  clear: () => void
  evaluate: () => Promise<void>
  loadExpression: (expression: string) => void

  history: HistoryItem[]
  clearHistory: () => void

  exchanges: AIExchange[]
  ask: (question: string) => Promise<void>
  retry: (id: string) => Promise<void>
  clearConversation: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

const INITIAL_CALCULATOR: CalculatorState = {
  expression: '',
  result: null,
  error: null,
  evaluated: false,
  pending: false,
}

const OPERATOR_AT_END = /[+\-*/^]$/

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const HISTORY_STORAGE_KEY = 'calcmate.history.v1'
const SETTINGS_STORAGE_KEY = 'calcmate.settings.v1'

const DEFAULT_SETTINGS: Settings = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
  engine: 'local',
  angleMode: 'deg',
  showSampleHistory: true,
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('dashboard')
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [calculator, setCalculator] = useState<CalculatorState>(INITIAL_CALCULATOR)
  const [savedHistory, setSavedHistory] = useState<HistoryItem[]>([])
  const [exchanges, setExchanges] = useState<AIExchange[]>([])
  const [storageLoaded, setStorageLoaded] = useState(false)

  useEffect(() => {
    try {
      const rawHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY)
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory)
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (item): item is HistoryItem =>
              item &&
              typeof item === 'object' &&
              typeof item.id === 'string' &&
              typeof item.expression === 'string' &&
              typeof item.result === 'string' &&
              typeof item.timestamp === 'number',
          )
          setSavedHistory(valid)
        }
      }
      const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings)
        if (parsed && typeof parsed === 'object') {
          setSettings((prev) => ({
            apiBaseUrl: typeof parsed.apiBaseUrl === 'string' && parsed.apiBaseUrl ? parsed.apiBaseUrl : prev.apiBaseUrl,
            engine: parsed.engine === 'backend' || parsed.engine === 'local' ? parsed.engine : prev.engine,
            angleMode: parsed.angleMode === 'rad' || parsed.angleMode === 'deg' ? parsed.angleMode : prev.angleMode,
            showSampleHistory:
              typeof parsed.showSampleHistory === 'boolean' ? parsed.showSampleHistory : prev.showSampleHistory,
          }))
        }
      }
    } catch {
      // Ignore unavailable or malformed localStorage data.
    } finally {
      setStorageLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!storageLoaded) return
    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(savedHistory))
    } catch {
      // Ignore storage quota errors.
    }
  }, [savedHistory, storageLoaded])

  useEffect(() => {
    if (!storageLoaded) return
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Ignore storage quota errors.
    }
  }, [settings, storageLoaded])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const input = useCallback((value: string, kind: KeyKind) => {
    setCalculator((prev) => {
      if (prev.pending) return prev
      let base = prev.expression
      if (prev.evaluated) {
        base = kind === 'operand' ? '' : (prev.result ?? '')
      }
      if (kind === 'operator' && OPERATOR_AT_END.test(base) && value !== '-') {
        base = base.slice(0, -1)
      }
      if (kind === 'operator' && base === '' && value !== '-') return prev
      return { ...prev, expression: base + value, evaluated: false, error: null }
    })
  }, [])

  const backspace = useCallback(() => {
    setCalculator((prev) => {
      if (prev.pending) return prev
      if (prev.evaluated) return { ...prev, evaluated: false, error: null }
      return { ...prev, expression: removeLastToken(prev.expression), error: null }
    })
  }, [])

  const clear = useCallback(() => setCalculator(INITIAL_CALCULATOR), [])

  const loadExpression = useCallback((expression: string) => {
    setCalculator({ ...INITIAL_CALCULATOR, expression })
  }, [])

  const evaluate = useCallback(async () => {
    const { expression, pending } = calculator
    if (pending || !expression.trim()) return

    const record = (result: string, source: HistoryItem['source']) => {
      setCalculator((prev) => ({ ...prev, result, error: null, evaluated: true, pending: false }))
      setSavedHistory((prev) => [{ id: createId(), expression, result, timestamp: Date.now(), source }, ...prev])
    }

    if (settings.engine === 'local') {
      try {
        record(formatResult(evaluateExpression(expression, settings.angleMode)), 'local')
      } catch (error) {
        const message = error instanceof CalcError ? error.message : 'Could not evaluate this expression'
        setCalculator((prev) => ({ ...prev, error: message, evaluated: false }))
      }
      return
    }

    setCalculator((prev) => ({ ...prev, pending: true, error: null }))
    try {
      const result = await api.calculate(settings.apiBaseUrl, {
        expression: toBackendExpression(expression),
        angleMode: settings.angleMode,
      })
      record(result, 'backend')
    } catch (error) {
      const message = getErrorMessage(error)
      setCalculator((prev) => ({ ...prev, pending: false, error: message }))
      toast.error('Backend calculation failed', { description: message })
    }
  }, [calculator, settings])

  const history = useMemo(
    () => (settings.showSampleHistory ? [...savedHistory, ...SAMPLE_HISTORY] : savedHistory),
    [savedHistory, settings.showSampleHistory],
  )

  const clearHistory = useCallback(() => {
    setSavedHistory([])
    setSettings((prev) => ({ ...prev, showSampleHistory: false }))
  }, [])

  const runSolve = useCallback(
    async (id: string, question: string) => {
      try {
        const solution = await api.solve(settings.apiBaseUrl, question)
        setExchanges((prev) => prev.map((ex) => (ex.id === id ? { id, question, status: 'success', solution } : ex)))
      } catch (error) {
        const message = getErrorMessage(error)
        setExchanges((prev) => prev.map((ex) => (ex.id === id ? { id, question, status: 'error', error: message } : ex)))
      }
    },
    [settings.apiBaseUrl],
  )

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (!trimmed) return
      const id = createId()
      setExchanges((prev) => [...prev, { id, question: trimmed, status: 'loading' }])
      await runSolve(id, trimmed)
    },
    [runSolve],
  )

  const retry = useCallback(
    async (id: string) => {
      const exchange = exchanges.find((ex) => ex.id === id)
      if (!exchange) return
      setExchanges((prev) => prev.map((ex) => (ex.id === id ? { id, question: ex.question, status: 'loading' } : ex)))
      await runSolve(id, exchange.question)
    },
    [exchanges, runSolve],
  )

  const clearConversation = useCallback(() => setExchanges([]), [])

  const value: AppContextValue = {
    view,
    setView,
    settings,
    updateSettings,
    calculator,
    input,
    backspace,
    clear,
    evaluate,
    loadExpression,
    history,
    clearHistory,
    exchanges,
    ask,
    retry,
    clearConversation,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
