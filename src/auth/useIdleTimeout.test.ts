import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_LIMIT_MS, IDLE_WARNING_MS, createIdleTimers } from "./useIdleTimeout";

describe("idle timers", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("warns five minutes before the idle deadline", () => {
    const onWarn = vi.fn();
    const onIdle = vi.fn();
    createIdleTimers({ onWarn, onIdle });

    vi.advanceTimersByTime(IDLE_WARNING_MS - 1);
    expect(onWarn).not.toHaveBeenCalled();
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onWarn).toHaveBeenCalledTimes(1);
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(IDLE_LIMIT_MS - IDLE_WARNING_MS);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("restarts both timers on activity", () => {
    const onWarn = vi.fn();
    const onIdle = vi.fn();
    const timers = createIdleTimers({ onWarn, onIdle, limitMs: 1000, warningMs: 800 });

    vi.advanceTimersByTime(700);
    timers.reset();
    vi.advanceTimersByTime(700);
    expect(onWarn).not.toHaveBeenCalled();
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(onWarn).toHaveBeenCalledTimes(1);
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("clears both timers when stopped", () => {
    const onWarn = vi.fn();
    const onIdle = vi.fn();
    const timers = createIdleTimers({ onWarn, onIdle, limitMs: 1000, warningMs: 800 });

    timers.stop();
    vi.advanceTimersByTime(5000);
    expect(onWarn).not.toHaveBeenCalled();
    expect(onIdle).not.toHaveBeenCalled();
  });
});
