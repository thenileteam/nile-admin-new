import { useEffect, useRef } from "react";

export const IDLE_LIMIT_MS = 30 * 60 * 1000;
export const IDLE_WARNING_MS = 25 * 60 * 1000;

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
];

/**
 * The timer part of the idle guard, kept separate from React so the warning
 * and deadline can be tested without waiting half an hour.
 */
export const createIdleTimers = ({
  onWarn,
  onIdle,
  limitMs = IDLE_LIMIT_MS,
  warningMs = IDLE_WARNING_MS,
}: {
  onWarn: () => void;
  onIdle: () => void;
  limitMs?: number;
  warningMs?: number;
}) => {
  let warning: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;

  const reset = () => {
    if (warning) clearTimeout(warning);
    if (deadline) clearTimeout(deadline);
    warning = setTimeout(onWarn, warningMs);
    deadline = setTimeout(onIdle, limitMs);
  };

  const stop = () => {
    if (warning) clearTimeout(warning);
    if (deadline) clearTimeout(deadline);
  };

  reset();
  return { reset, stop };
};

/**
 * Signs the admin out after half an hour without interaction, warning five
 * minutes before. Every event restarts both timers.
 */
export const useIdleTimeout = ({
  enabled,
  onWarn,
  onIdle,
  limitMs = IDLE_LIMIT_MS,
  warningMs = IDLE_WARNING_MS,
}: {
  enabled: boolean;
  onWarn: () => void;
  onIdle: () => void;
  limitMs?: number;
  warningMs?: number;
}) => {
  const warnRef = useRef(onWarn);
  const idleRef = useRef(onIdle);
  warnRef.current = onWarn;
  idleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;

    const timers = createIdleTimers({
      onWarn: () => warnRef.current(),
      onIdle: () => idleRef.current(),
      limitMs,
      warningMs,
    });
    const reset = timers.reset;
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    // Returning to the tab also counts as activity.
    document.addEventListener("visibilitychange", reset);

    return () => {
      timers.stop();
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
      document.removeEventListener("visibilitychange", reset);
    };
  }, [enabled, limitMs, warningMs]);
};
