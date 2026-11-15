import type { AISolution, AISolutionStep, AngleMode } from './types'

/**
 * Centralized client for the CalcMate Flask backend.
 *
 * Expected contract:
 *   GET  /api/health      -> { status: "ok", ... }
 *   POST /api/calculate   { expression, angle_mode } -> { result }
 *   POST /api/ai/solve    { question } -> { question?, steps: [{ title?, content, expression? } | string],
 *                                           final_answer, explanation?, model? }
 * Errors should respond with a non-2xx status and { error: "message" }.
 */

export const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000'

export const API_ENDPOINTS = {
  health: { method: 'GET', path: '/api/health' },
  calculate: { method: 'POST', path: '/api/calculate' },
  solve: { method: 'POST', path: '/api/ai/solve' },
} as const

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'invalid-response'

export class ApiError extends Error {
  constructor(
    message: string,
    public kind: ApiErrorKind,
    public status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(baseUrl: string, path: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
  const url = `${baseUrl.replace(/\/+$/, '')}${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('The backend took too long to respond.', 'timeout')
    }
    throw new ApiError(`Could not reach the backend at ${baseUrl}. Make sure the Flask server is running.`, 'network')
  } finally {
    clearTimeout(timer)
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // Non-JSON body; handled below.
  }

  if (!response.ok) {
    const message =
      (body && typeof body === 'object' && ('error' in body || 'message' in body)
        ? String((body as Record<string, unknown>).error ?? (body as Record<string, unknown>).message)
        : null) ?? `Request failed with status ${response.status}.`
    throw new ApiError(message, 'http', response.status)
  }

  if (body === null) throw new ApiError('The backend returned an empty or non-JSON response.', 'invalid-response')
  return body as T
}

export interface HealthResponse {
  status: string
  [key: string]: unknown
}

interface CalculateResponse {
  result: string | number
}

interface RawSolveResponse {
  question?: string
  steps?: Array<string | { title?: string; content?: string; explanation?: string; expression?: string }>
  final_answer?: string | number
  answer?: string | number
  explanation?: string
  model?: string
}

function normalizeSolution(question: string, raw: RawSolveResponse): AISolution {
  const finalAnswer = raw.final_answer ?? raw.answer
  if (finalAnswer === undefined || finalAnswer === null || finalAnswer === '') {
    throw new ApiError('The backend response did not include a final answer.', 'invalid-response')
  }
  const steps: AISolutionStep[] = (raw.steps ?? [])
    .map((step) =>
      typeof step === 'string'
        ? { content: step }
        : { title: step.title, content: step.content ?? step.explanation ?? '', expression: step.expression },
    )
    .filter((step) => step.content || step.expression)

  return {
    question: raw.question ?? question,
    steps,
    finalAnswer: String(finalAnswer),
    explanation: raw.explanation,
    model: raw.model,
  }
}

export const api = {
  health(baseUrl: string) {
    return request<HealthResponse>(baseUrl, API_ENDPOINTS.health.path, { method: 'GET' }, 5_000)
  },

  async calculate(baseUrl: string, payload: { expression: string; angleMode: AngleMode }) {
    const data = await request<CalculateResponse>(baseUrl, API_ENDPOINTS.calculate.path, {
      method: 'POST',
      body: JSON.stringify({ expression: payload.expression, angle_mode: payload.angleMode }),
    })
    if (data.result === undefined || data.result === null) {
      throw new ApiError('The backend response did not include a result.', 'invalid-response')
    }
    return String(data.result)
  },

  async solve(baseUrl: string, question: string) {
    const data = await request<RawSolveResponse>(
      baseUrl,
      API_ENDPOINTS.solve.path,
      { method: 'POST', body: JSON.stringify({ question }) },
      60_000,
    )
    return normalizeSolution(question, data)
  },
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}
