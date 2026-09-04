import { useEffect, useRef } from 'react';
import { ping } from '../lib/api';

/** Interval short enough to keep Fly auto-stop from suspending the machine. */
const PING_INTERVAL_MS = 25_000;

/**
 * Periodically hits the server while `active` so Fly.io does not auto-stop
 * the machine during a long running workout.
 */
export function useKeepAlive(active: boolean): void {
  const inFlight = useRef(false);

  useEffect(() => {
    if (!active) return;

    const sendPing = () => {
      if (inFlight.current) return;
      inFlight.current = true;
      void ping()
        .catch(() => {
          // Ignore transient network errors; next interval will retry.
        })
        .finally(() => {
          inFlight.current = false;
        });
    };

    sendPing();
    const id = window.setInterval(sendPing, PING_INTERVAL_MS);

    return () => {
      window.clearInterval(id);
    };
  }, [active]);
}
