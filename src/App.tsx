import { useState, useEffect, useSyncExternalStore } from "react";
import { useAuthStore } from "@/stores/authStore";
import { getMatrixClient, setClientChangeNotifier } from "@/lib/matrix";
import { LoginPage } from "@/pages/LoginPage";
import { MainPage } from "@/pages/MainPage";
import { ThemeProvider } from "@/components/settings/ThemeProvider";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

/**
 * Wait for Zustand persist to finish rehydrating from localStorage before
 * deciding whether to show LoginPage or MainPage.  Without this gate the
 * store can rehydrate *after* the first render and overwrite in-memory
 * state that was just set by the login flow, causing a flash to blank.
 */
function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(
    useAuthStore.persist?.hasHydrated?.() ?? true,
  );

  useEffect(() => {
    if (hydrated) return;
    const unsub = useAuthStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    // In case it already finished between the initial check and the effect
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  return hydrated;
}

/**
 * Subscribe to the module-level matrixClient so React re-renders when it
 * changes.  getMatrixClient() alone is not reactive — wrapping it in
 * useSyncExternalStore makes it safe to use as a render guard.
 */
const clientListeners = new Set<() => void>();
let lastClientSnapshot = getMatrixClient();

setClientChangeNotifier(() => {
  lastClientSnapshot = getMatrixClient();
  clientListeners.forEach((l) => l());
});

function useMatrixClientExists(): boolean {
  const client = useSyncExternalStore(
    (cb) => {
      clientListeners.add(cb);
      return () => clientListeners.delete(cb);
    },
    () => lastClientSnapshot,
  );
  return !!client;
}

function App() {
  const hydrated = useAuthHydrated();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasClient = useMatrixClientExists();

  // While the auth store is rehydrating from localStorage, show nothing
  // (this is typically < 1 frame — localStorage reads are synchronous).
  if (!hydrated) {
    return null;
  }

  // Show main app if logged in OR we still have an active Matrix client
  // (guards against brief persist rehydration glitches).
  const showMainApp = isLoggedIn || hasClient;

  return (
    <ThemeProvider>
      <ErrorBoundary>
        {showMainApp ? <MainPage /> : <LoginPage />}
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
