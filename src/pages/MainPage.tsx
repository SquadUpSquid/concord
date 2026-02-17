import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { initMatrixClient, getMatrixClient } from "@/lib/matrix";
import { registerEventHandlers } from "@/lib/matrixEventHandlers";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export function MainPage() {
  const [restoring, setRestoring] = useState(!getMatrixClient());
  const initRef = useRef(false);

  useEffect(() => {
    // Already have a client (e.g. fresh login just created it) — nothing to do.
    if (getMatrixClient()) {
      setRestoring(false);
      return;
    }

    // Guard against React StrictMode double-firing this effect in dev mode,
    // which would start two concurrent initMatrixClient calls and corrupt state.
    if (initRef.current) return;
    initRef.current = true;

    const { accessToken, userId, deviceId, homeserverUrl } =
      useAuthStore.getState();

    if (accessToken && userId && deviceId && homeserverUrl) {
      let cancelled = false;

      initMatrixClient(homeserverUrl, accessToken, userId, deviceId)
        .then((client) => {
          if (cancelled) return;
          registerEventHandlers(client);
          setRestoring(false);
        })
        .catch((err) => {
          if (cancelled) return;
          console.error("Session restore failed:", err);
          useAuthStore.getState().logout();
        });

      return () => {
        cancelled = true;
      };
    } else {
      // No credentials stored — shouldn't normally reach MainPage without
      // them, but handle gracefully by going back to login.
      console.warn("MainPage mounted without stored credentials — logging out.");
      useAuthStore.getState().logout();
    }
  }, []);

  if (restoring) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-tertiary">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner />
          <p className="text-text-muted">Connecting to Matrix...</p>
        </div>
      </div>
    );
  }

  return <AppLayout />;
}
