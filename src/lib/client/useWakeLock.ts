"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Custom hook to request and maintain a Screen Wake Lock.
 * Keeps mobile and desktop screens awake during active matches (REL-04).
 * Automatically releases lock on blur/background and re-acquires on focus.
 */
export function useWakeLock(enabled: boolean = true) {
  const wakeLockRef = useRef<any>(null);

  const requestLock = useCallback(async () => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) return;
    try {
      if (!wakeLockRef.current || wakeLockRef.current.released) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        wakeLockRef.current.addEventListener?.("release", () => {
          wakeLockRef.current = null;
        });
      }
    } catch (err) {
      // Screen wake lock may be rejected if battery saver is on or user switched tabs
      console.warn("[WakeLock] Screen wake lock unavailable or rejected:", err);
    }
  }, []);

  const releaseLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn("[WakeLock] Error releasing wake lock:", err);
      }
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      requestLock();
    } else {
      releaseLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && enabled) {
        requestLock();
      } else if (document.visibilityState === "hidden") {
        releaseLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseLock();
    };
  }, [enabled, requestLock, releaseLock]);

  return { requestLock, releaseLock };
}
