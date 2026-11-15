'use client'

import useSWR from 'swr'
import { api } from '@/lib/api'

export type BackendStatus = 'checking' | 'online' | 'offline'

export function useBackendHealth(baseUrl: string) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ['backend-health', baseUrl],
    ([, url]) => api.health(url),
    { refreshInterval: 30_000, shouldRetryOnError: false, revalidateOnFocus: true },
  )

  const status: BackendStatus = isLoading ? 'checking' : error ? 'offline' : data ? 'online' : 'checking'

  return { status, data, error: error as Error | undefined, isValidating, recheck: () => mutate() }
}
