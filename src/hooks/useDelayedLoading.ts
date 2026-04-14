import { useEffect, useRef, useState } from 'react';

/**
 * Returns a boolean indicating whether a loading skeleton should be visible.
 *
 * Two rules applied together:
 *  1. Delay: don't show the skeleton until `delayMs` has elapsed with `loading === true`.
 *     If the real content arrives before then, no skeleton is ever shown — avoiding
 *     the jarring "skeleton flash" on fast loads.
 *  2. Minimum duration: once the skeleton has been shown, keep it visible for at
 *     least `minDurationMs` so it doesn't vanish after a single frame, which also
 *     reads as a jarring flash.
 *
 * Based on the "don't show for fast loads, don't hide too fast" pattern commonly
 * used by design systems (Material, Carbon, etc.).
 */
export function useDelayedLoading(
  loading: boolean,
  { delayMs = 200, minDurationMs = 400 }: { delayMs?: number; minDurationMs?: number } = {}
): boolean {
  const [show, setShow] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (loading) {
      if (show) return; // already showing, nothing to schedule
      const timer = setTimeout(() => {
        setShow(true);
        shownAtRef.current = Date.now();
      }, delayMs);
      return () => clearTimeout(timer);
    }

    // loading === false
    if (!show) return; // never reached show=true, nothing to do
    const shownAt = shownAtRef.current ?? 0;
    const elapsed = Date.now() - shownAt;
    const remaining = Math.max(0, minDurationMs - elapsed);
    const timer = setTimeout(() => {
      setShow(false);
      shownAtRef.current = null;
    }, remaining);
    return () => clearTimeout(timer);
  }, [loading, show, delayMs, minDurationMs]);

  return show;
}
