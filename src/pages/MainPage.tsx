import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { initMatrixClient, getMatrixClient } from "@/lib/matrix";
import { registerEventHandlers } from "@/lib/matrixEventHandlers";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export function MainPage() {
  const [restoring, setRestoring] = useState(!getMatrixClient());

  useEffect(() => {
    // Already have a client (e.g. fresh login just created it) — nothing to do.
    if (getMatrixClient()) {
      setRestoring(false);
      return;
    }

    const { accessToken, userId, deviceId, homeserverUrl } =
      useAuthStore.getState();

    if (!accessToken || !userId || !deviceId || !homeserverUrl) {
      console.warn("MainPage mounted without stored credentials — logging out.");
      useAuthStore.getState().logout();
      return;
    }

    // initMatrixClient deduplicates concurrent calls internally, so this is
    // safe even if React StrictMode double-fires this effect.
    initMatrixClient(homeserverUrl, accessToken, userId, deviceId)
      .then((client) => {
        // registerEventHandlers is idempotent per client instance, so
        // duplicate calls from StrictMode are harmless.
        registerEventHandlers(client);
        setRestoring(false);
      })
      .catch((err) => {
        console.error("Session restore failed:", err);
        useAuthStore.getState().logout();
      });
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
