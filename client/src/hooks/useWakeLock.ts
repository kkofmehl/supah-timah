import { useEffect, useRef } from 'react';

/**
 * Requests a screen wake lock while `active` so mobile devices do not sleep
 * mid-workout. Re-acquires after visibility changes or unexpected release.
 */
export function useWakeLock(active: boolean): void {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!active) {
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
      return;
    }

    let cancelled = false;

    async function acquire() {
      if (!('wakeLock' in navigator)) return;
      if (document.visibilityState !== 'visible') return;
      if (wakeLockRef.current && !wakeLockRef.current.released) return;

      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled || !activeRef.current) {
          await lock.release().catch(() => undefined);
          return;
        }
        wakeLockRef.current = lock;
        lock.addEventListener('release', () => {
          if (wakeLockRef.current === lock) {
            wakeLockRef.current = null;
          }
          // Browser may release on brief blur; re-request if still active.
          if (!cancelled && activeRef.current && document.visibilityState === 'visible') {
            void acquire();
          }
        });
      } catch {
        // Wake lock not available or denied
      }
    }

    void acquire();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeRef.current) {
        void acquire();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
    };
  }, [active]);
}
