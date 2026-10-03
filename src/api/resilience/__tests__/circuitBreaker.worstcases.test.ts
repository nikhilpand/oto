import { CircuitBreaker } from '@/api/resilience/circuitBreaker';

describe('CircuitBreaker Resilience — Worst-Case Stress Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('trips to OPEN after exact failureThreshold and fast-fails downstream requests without calling fn', async () => {
    const cb = new CircuitBreaker('test-cdn', {
      failureThreshold: 3,
      resetTimeoutMs: 15_000,
      windowMs: 45_000,
    });

    const mockFn = jest.fn().mockRejectedValue(new Error('CDN Connection Dropped'));

    // 1st failure
    const r1 = await cb.execute(mockFn, 'fallback');
    expect(r1).toBe('fallback');
    expect(cb.getState()).toBe('CLOSED');

    // 2nd failure
    const r2 = await cb.execute(mockFn, 'fallback');
    expect(r2).toBe('fallback');
    expect(cb.getState()).toBe('CLOSED');

    // 3rd failure -> Trips circuit to OPEN
    const r3 = await cb.execute(mockFn, 'fallback');
    expect(r3).toBe('fallback');
    expect(cb.getState()).toBe('OPEN');

    // 4th request while OPEN -> Must NOT call mockFn at all!
    mockFn.mockClear();
    const r4 = await cb.execute(mockFn, 'instant-fallback');
    expect(r4).toBe('instant-fallback');
    expect(mockFn).not.toHaveBeenCalled();
  });

  test('transitions to HALF_OPEN after cooldown and trips back to OPEN immediately on 1 canary failure', async () => {
    const cb = new CircuitBreaker('test-api', {
      failureThreshold: 3,
      resetTimeoutMs: 15_000,
      windowMs: 45_000,
    });

    // Fail 3 times to open circuit
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    // Advance time by 14,999ms (1ms before cooldown)
    jest.advanceTimersByTime(14_999);
    expect(cb.getState()).toBe('OPEN');

    // Advance 1 more ms -> reaches 15,000ms cooldown -> transitions to HALF_OPEN
    jest.advanceTimersByTime(1);
    expect(cb.getState()).toBe('HALF_OPEN');

    // Canary probe fails -> trips back to OPEN on single failure (does NOT require 3)
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');
  });

  test('resets to CLOSED when canary probe succeeds during HALF_OPEN', async () => {
    const cb = new CircuitBreaker('test-api', {
      failureThreshold: 3,
      resetTimeoutMs: 15_000,
      windowMs: 45_000,
    });

    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    // Elapse cooldown
    jest.advanceTimersByTime(15_000);
    expect(cb.getState()).toBe('HALF_OPEN');

    // Canary succeeds
    const mockSuccess = jest.fn().mockResolvedValue('healthy-stream');
    const result = await cb.execute(mockSuccess, 'fallback');

    expect(result).toBe('healthy-stream');
    expect(cb.getState()).toBe('CLOSED');
  });

  test('sliding window prunes stale failures over time so sporadic failures never trip circuit', () => {
    const cb = new CircuitBreaker('test-api', {
      failureThreshold: 3,
      resetTimeoutMs: 15_000,
      windowMs: 45_000,
    });

    // 1st failure at t=0
    cb.recordFailure();
    expect(cb.getState()).toBe('CLOSED');

    // Advance 50 seconds (exceeds windowMs of 45s)
    jest.advanceTimersByTime(50_000);

    // 2nd failure at t=50s (1st failure was pruned)
    cb.recordFailure();
    expect(cb.getState()).toBe('CLOSED');

    // Advance another 50 seconds
    jest.advanceTimersByTime(50_000);

    // 3rd failure at t=100s (2nd failure was pruned)
    cb.recordFailure();
    expect(cb.getState()).toBe('CLOSED'); // Should STILL be CLOSED because only 1 active failure in window!
  });

  test('catches non-Error thrown values (strings, null, numbers) without uncaught exception', async () => {
    const cb = new CircuitBreaker('test-odd-errors');

    const throwString = () => Promise.reject('Plain string rejection');
    const throwNull = () => Promise.reject(null);
    const throwNum = () => Promise.reject(500);

    expect(await cb.execute(throwString, 'safe-fallback')).toBe('safe-fallback');
    expect(await cb.execute(throwNull, 'safe-fallback')).toBe('safe-fallback');
    expect(await cb.execute(throwNum, 'safe-fallback')).toBe('safe-fallback');
  });

  test('manual reset immediately restores CLOSED state and clears error history', () => {
    const cb = new CircuitBreaker('test-reset', { failureThreshold: 2 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    cb.reset();
    expect(cb.getState()).toBe('CLOSED');

    // A single failure should not trip it after reset
    cb.recordFailure();
    expect(cb.getState()).toBe('CLOSED');
  });
});
