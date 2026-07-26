/**
 * Network Monitor & Logger
 * Tracks and logs API requests and server health for real-time debugging.
 */

export interface NetworkLog {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'DELETE';
  endpoint: string;
  url: string;
  status: number | 'ERR';
  durationMs: number;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: string;
}

type Listener = (logs: NetworkLog[]) => void;

class NetworkMonitor {
  private logs: NetworkLog[] = [];
  private listeners: Set<Listener> = new Set();
  private maxLogs = 25;

  public getLogs(): NetworkLog[] {
    return [...this.logs];
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getLogs());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentLogs = this.getLogs();
    this.listeners.forEach((listener) => listener(currentLogs));
  }

  public addLog(log: Omit<NetworkLog, 'id' | 'timestamp'>): void {
    const newLog: NetworkLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
    };
    this.logs = [newLog, ...this.logs.slice(0, this.maxLogs - 1)];
    this.notify();
  }

  public clearLogs(): void {
    this.logs = [];
    this.notify();
  }

  public async pingBackend(): Promise<{ success: boolean; statusText: string; latencyMs: number }> {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://chat-backend-r2cp.onrender.com';
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const startTime = Date.now();

    try {
      const response = await fetch(`${cleanBaseUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const durationMs = Date.now() - startTime;
      const data = await response.json();

      this.addLog({
        method: 'GET',
        endpoint: '/health',
        url: `${cleanBaseUrl}/health`,
        status: response.status,
        durationMs,
        responseBody: data,
      });

      if (response.ok && data.success) {
        return {
          success: true,
          statusText: data.message || 'Server operational',
          latencyMs: durationMs,
        };
      }

      return {
        success: false,
        statusText: data.message || `HTTP ${response.status}`,
        latencyMs: durationMs,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : 'Network failure';
      this.addLog({
        method: 'GET',
        endpoint: '/health',
        url: `${cleanBaseUrl}/health`,
        status: 'ERR',
        durationMs,
        error: errorMessage,
      });

      return {
        success: false,
        statusText: `Connection failed: ${errorMessage}`,
        latencyMs: durationMs,
      };
    }
  }
}

export const networkMonitor = new NetworkMonitor();
