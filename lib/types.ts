export type AngleMode = 'deg' | 'rad'

export type CalcEngine = 'local' | 'backend'

export type View = 'dashboard' | 'standard' | 'scientific' | 'ai' | 'history' | 'settings'

export type HistorySource = 'local' | 'backend' | 'sample'

export interface HistoryItem {
  id: string
  expression: string
  result: string
  timestamp: number
  source: HistorySource
}

export interface Settings {
  apiBaseUrl: string
  engine: CalcEngine
  angleMode: AngleMode
  showSampleHistory: boolean
}

export interface AISolutionStep {
  title?: string
  content: string
  expression?: string
}

export interface AISolution {
  question: string
  steps: AISolutionStep[]
  finalAnswer: string
  explanation?: string
  expression?: string
  verified?: boolean
  isApproximate?: boolean
  isAmbiguous?: boolean
  model?: string
}

export type AIExchange =
  | { id: string; question: string; status: 'loading' }
  | { id: string; question: string; status: 'success'; solution: AISolution }
  | { id: string; question: string; status: 'error'; error: string }
