/**
 * Service worker registration.
 * Registers /sw.js in production builds only (skip in dev to avoid stale caches).
 */

export interface SWState {
  /** Service worker is registered and active */
  active: boolean;
  /** Precaching has completed */
  precached: boolean;
  /** Number of assets successfully precached */
  precacheCount: number;
  /** Total number of assets to precache */
  precacheTotal: number;
}

let _state: SWState = {
  active: false,
  precached: false,
  precacheCount: 0,
  precacheTotal: 0,
};

const _listeners = new Set<(s: SWState) => void>();

function emit() {
  for (const cb of _listeners) cb({ ..._state });
}

export function getSWState(): SWState {
  return { ..._state };
}

export function subscribeSW(cb: (s: SWState) => void): () => void {
  _listeners.add(cb);
  cb(getSWState());
  return () => _listeners.delete(cb);
}

export async function registerServiceWorker(): Promise<void> {
  // Dev: not only skip registration — actively remove any worker left over
  // from a previous production/preview run on this origin. A stale SW
  // intercepting Vite's dev modules makes the whole app appear broken.
  if (import.meta.env.DEV) {
    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) await reg.unregister();
        const keys = await caches.keys();
        for (const key of keys) {
          if (key.startsWith("tahqeeq-")) await caches.delete(key);
        }
        if (regs.length) {
          console.log("[SW] Unregistered stale worker(s) in development");
        }
      } catch {
        /* ignore */
      }
    }
    return;
  }

  if (!("serviceWorker" in navigator)) {
    console.log("[SW] Not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");

    const updateState = () => {
      const sw = registration.active || registration.waiting || registration.installing;
      _state = { ..._state, active: !!sw };
      emit();
    };

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "activated") {
          _state = { ..._state, active: true };
          emit();
        }
      });
    });

    // Listen for messages from the SW
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "SW_PRECACHED") {
        _state = {
          ..._state,
          precached: true,
          precacheCount: event.data.ok,
          precacheTotal: event.data.total,
        };
        emit();
      }
    });

    updateState();

    // If already active, poke it to report precache status
    if (registration.active) {
      registration.active.postMessage({ type: "GET_STATUS" });
    }

    console.log("[SW] Registered:", registration.scope);
  } catch (err) {
    console.error("[SW] Registration failed:", err);
  }
}
