import { useEffect, useRef, useCallback } from 'react';

/**
 * Returns a stable throttled version of `fn`. The first call fires immediately;
 * subsequent calls within `wait` ms are coalesced and the trailing one fires
 * after the window. Cleans up on unmount.
 */
export function useThrottle(fn, wait = 1000) {
  const fnRef = useRef(fn);
  const lastRef = useRef(0);
  const timerRef = useRef(null);
  const argsRef = useRef(null);

  useEffect(() => { fnRef.current = fn; }, [fn]);

  const throttled = useCallback((...args) => {
    const now = Date.now();
    const remaining = wait - (now - lastRef.current);
    argsRef.current = args;
    if (remaining <= 0) {
      lastRef.current = now;
      fnRef.current?.(...args);
    } else if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        lastRef.current = Date.now();
        timerRef.current = null;
        fnRef.current?.(...(argsRef.current || []));
      }, remaining);
    }
  }, [wait]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return throttled;
}
