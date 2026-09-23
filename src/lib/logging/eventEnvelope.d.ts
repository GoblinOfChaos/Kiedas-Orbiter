export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogSource = 'frontend' | 'rust' | 'network' | 'ipc' | 'data';
export type LogPhase = 'started' | 'sample' | 'complete' | 'failed' | 'ignored';
export type LogOutcome = 'success' | 'failure' | 'cancelled' | 'dropped' | 'unknown';

export interface StructuredEvent {
  schema: number;
  event_id: string;
  session_id: string;
  sequence: number;
  timestamp_utc: string;
  monotonic_ms: number;
  process: string;
  window: string;
  source: LogSource;
  level: LogLevel;
  event: string;
  screen?: string;
  route?: string;
  component?: string;
  control_id?: string;
  interaction?: string;
  correlation_id?: string;
  parent_event_id?: string;
  phase?: LogPhase;
  duration_ms?: number;
  outcome?: LogOutcome;
  payload: Record<string, unknown>;
  error?: Record<string, unknown>;
  build: Record<string, unknown>;
}
