/**
 * Circuit Breaker Pattern for Mobile Streaming Resiliency
 *
 * Clean-room adaptation of BITCHORD_RE/10_SOURCES.md (Section 3).
 *
 * Prevents mobile network timeouts from locking up the UI or playback queue
 * when external CDNs or APIs suffer transient outages, rate limits, or packet drops.
 *
 * States:
 *  - CLOSED: Normal operation. Requests pass through.
 *  - OPEN: Tripped after N consecutive failures. Fast-fails immediately.
 *  - HALF_OPEN: Probe state after cooldown window. Allows 1 request to test recovery.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  readonly failureThreshold: number; // e.g. 3 consecutive failures
  readonly resetTimeoutMs: number;    // e.g. 15,000ms cooldown before probe
  readonly windowMs: number;          // e.g. 45,000ms sliding error window
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 15_000,
  windowMs: 45_000,
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureTimestamps: number[] = [];
  private lastStateChange: number = Date.now();
  private readonly config: CircuitBreakerConfig;

  constructor(
    public readonly serviceName: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Returns current state, updating from OPEN to HALF_OPEN if cooldown has elapsed.
   */
  getState(): CircuitState {
    const now = Date.now();
    if (this.state === 'OPEN') {
      if (now - this.lastStateChange >= this.config.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.lastStateChange = now;
      }
    }
    return this.state;
  }

  /**
   * Executes a task guarded by the circuit breaker.
   * If the circuit is OPEN, returns the fallback value immediately without calling fn().
   */
  async execute<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      return fallback;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch {
      this.recordFailure();
      return fallback;
    }
  }

  /**
   * Records a successful request.
   */
  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failureTimestamps = [];
      this.lastStateChange = Date.now();
    } else if (this.state === 'CLOSED') {
      this.failureTimestamps = [];
    }
  }

  /**
   * Records a failed request.
   */
  recordFailure(): void {
    const now = Date.now();
    this.failureTimestamps.push(now);

    // Prune failures outside the sliding window
    const windowStart = now - this.config.windowMs;
    this.failureTimestamps = this.failureTimestamps.filter((t) => t >= windowStart);

    if (this.state === 'HALF_OPEN') {
      // Probe failed — trip back to OPEN immediately
      this.state = 'OPEN';
      this.lastStateChange = now;
    } else if (this.state === 'CLOSED') {
      if (this.failureTimestamps.length >= this.config.failureThreshold) {
        this.state = 'OPEN';
        this.lastStateChange = now;
      }
    }
  }

  /**
   * Resets the circuit breaker to CLOSED.
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureTimestamps = [];
    this.lastStateChange = Date.now();
  }
}

// Global registry of service circuit breakers
export const circuitBreakers = {
  jiosaavn: new CircuitBreaker('jiosaavn', { failureThreshold: 3, resetTimeoutMs: 15_000 }),
  lyrics: new CircuitBreaker('lyrics', { failureThreshold: 4, resetTimeoutMs: 20_000 }),
  secondary: new CircuitBreaker('secondary', { failureThreshold: 3, resetTimeoutMs: 30_000 }),
};

export const jioSaavnCircuitBreaker = circuitBreakers.jiosaavn;

