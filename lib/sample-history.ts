import type { HistoryItem } from './types'

/** Preview-only entries, always labelled "Sample" in the UI and never mixed with saved calculations. */
export const SAMPLE_HISTORY: HistoryItem[] = [
  { id: 'sample-1', expression: '2450*15%', result: '367.5', timestamp: Date.UTC(2026, 10, 14, 16, 42), source: 'sample' },
  { id: 'sample-2', expression: '√(144)+3^2', result: '21', timestamp: Date.UTC(2026, 10, 14, 15, 18), source: 'sample' },
  { id: 'sample-3', expression: 'sin(30)+cos(60)', result: '1', timestamp: Date.UTC(2026, 10, 14, 11, 5), source: 'sample' },
  { id: 'sample-4', expression: '6!/(2*3)', result: '120', timestamp: Date.UTC(2026, 10, 13, 19, 30), source: 'sample' },
  { id: 'sample-5', expression: 'ln(e^3)', result: '3', timestamp: Date.UTC(2026, 10, 13, 9, 12), source: 'sample' },
]
