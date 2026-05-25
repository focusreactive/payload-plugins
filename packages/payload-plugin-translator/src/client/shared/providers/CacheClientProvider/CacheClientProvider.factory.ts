import { QueryClient } from '@tanstack/react-query'

export interface QueryClientConfig {
  staleTime?: number
  gcTime?: number
  retry?: number | boolean
  refetchOnWindowFocus?: boolean
  refetchOnReconnect?: boolean
  refetchOnMount?: boolean
  retryDelay?: number | ((attemptIndex: number) => number)
}

export type QueryClientType = 'server' | 'client'

export class CacheClientProviderFactory {
  private clientQueryClient: QueryClient | null = null
  private readonly config: QueryClientConfig

  private static readonly DEFAULT_CONFIG: QueryClientConfig = {
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  }

  constructor(config?: Partial<QueryClientConfig>) {
    this.config = { ...CacheClientProviderFactory.DEFAULT_CONFIG, ...config }
  }

  /**
   * Creates QueryClient with specified type
   */
  create(type: QueryClientType): QueryClient {
    switch (type) {
      case 'server':
        return this.createServerQueryClient()

      case 'client':
        if (!this.clientQueryClient) {
          this.clientQueryClient = this.createClientQueryClient()
        }
        return this.clientQueryClient

      default:
        throw new Error(`Unknown QueryClient type: ${type}`)
    }
  }

  /**
   * Creates QueryClient for client-side rendering
   * Optimized for browser interaction and real-time updates
   */
  private createClientQueryClient(): QueryClient {
    return new QueryClient({
      defaultOptions: {
        queries: this.config,
        mutations: {
          retry: this.config.retry,
        },
      },
    })
  }

  /**
   * Creates QueryClient for server-side rendering
   * Optimized for ISR and hydration
   */
  private createServerQueryClient(): QueryClient {
    return new QueryClient({
      defaultOptions: {
        queries: {
          ...this.config,
          staleTime: Infinity,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
        },
        mutations: {
          retry: false,
        },
      },
    })
  }
}
