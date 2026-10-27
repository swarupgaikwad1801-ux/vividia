import { useEffect, useState } from "react";

/**
 * Keeps the screen on while the component using it is mounted (the Screen
 * Wake Lock API: Chrome and Edge, Safari 16.4+). Returns whether it is on,
 * so the screen only says "the screen stays on" when that is true.
 *
 * For the handoff card: a teacher reading slowly should not watch the phone
 * dim and lock in the child's hand. The browser drops the lock whenever the
 * tab is hidden, so it is taken again on return. Unsupported, refused (low
 * battery) or failed: false, and nothing else changes.
 */
export function useScreenAwake(): boolean {
  const [awake, setAwake] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.wakeLock?.request) return;
    let lock: WakeLockSentinel | null = null;
    let gone = false;

    const take = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (gone) {
          void next.release();
          return;
        }
        lock = next;
        setAwake(true);
        next.addEventListener("release", () => setAwake(false));
      } catch {
        setAwake(false);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void take();
    };

    void take();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  return awake;
}
