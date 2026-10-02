import { CircuitBreaker } from '../circuitBreaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts in CLOSED state and allows execution', async () => {
    const cb = new CircuitBreaker('test-service', { failureThreshold: 3 });
    expect(cb.getState()).toBe('CLOSED');

    const fn = jest.fn().mockResolvedValue('ok');
    const result = await cb.execute(fn, 'fallback');

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(cb.getState()).toBe('CLOSED');
  });

  it('trips to OPEN after reaching failure threshold', async () => {
    const cb = new CircuitBreaker('test-service', {
      failureThreshold: 3,
      resetTimeoutMs: 10_000,
      windowMs: 30_000,
    });

    const failingFn = jest.fn().mockRejectedValue(new Error('Network error'));

    // 1st failure
    const res1 = await cb.execute(failingFn, 'fallback1');
    expect(res1).toBe('fallback1');
    expect(cb.getState()).toBe('CLOSED');

    // 2nd failure
    const res2 = await cb.execute(failingFn, 'fallback2');
    expect(res2).toBe('fallback2');
    expect(cb.getState()).toBe('CLOSED');

    // 3rd failure — trips circuit
    const res3 = await cb.execute(failingFn, 'fallback3');
    expect(res3).toBe('fallback3');
    expect(cb.getState()).toBe('OPEN');

    // 4th call while OPEN: fast-fails without executing function
    const fn2 = jest.fn().mockResolvedValue('should not run');
    const fastFailRes = await cb.execute(fn2, 'fast_fail');
    expect(fastFailRes).toBe('fast_fail');
    expect(fn2).not.toHaveBeenCalled();
  });

  it('transitions to HALF_OPEN after resetTimeoutMs and closes on success', async () => {
    const cb = new CircuitBreaker('test-service', {
      failureThreshold: 2,
      resetTimeoutMs: 5_000,
    });

    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    // Advance time past reset timeout
    jest.advanceTimersByTime(5_001);
    expect(cb.getState()).toBe('HALF_OPEN');

    // Successful probe execution closes circuit
    const probeFn = jest.fn().mockResolvedValue('recovered');
    const probeRes = await cb.execute(probeFn, 'fallback');

    expect(probeRes).toBe('recovered');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('trips back to OPEN if probe fails in HALF_OPEN state', async () => {
    const cb = new CircuitBreaker('test-service', {
      failureThreshold: 2,
      resetTimeoutMs: 5_000,
    });

    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    jest.advanceTimersByTime(5_001);
    expect(cb.getState()).toBe('HALF_OPEN');

    // Failing probe trips back to OPEN
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');
  });
});
