export interface InfraResponse {
  app:        { version: string; env: string; ruby: string; rails: string; uptime_seconds: number };
  database:   { status: string; latency_ms?: number; pool_size?: number; pool_busy?: number };
  redis:      { status: string; used_memory_human?: string; clients?: number };
  sidekiq:    { status: string; processed?: number; failed?: number; enqueued?: number;
                queues?: Record<string, number>; retries?: number; dead?: number; processes?: number };
  deployment: { slot?: string; commit?: string };
}
