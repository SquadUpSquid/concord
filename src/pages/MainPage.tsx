import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { initMatrixClient, getMatrixClient } from "@/lib/matrix";
import { registerEventHandlers } from "@/lib/matrixEventHandlers";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export function MainPage() {
  const [restoring, setRestoring] = useState(!getMatrixClient());

  useEffect(() => {
    if (getMatrixClient()) {
      setRestoring(false);
      return;
    }

    const { accessToken, userId, deviceId, homeserverUrl } =
      useAuthStore.getState();

    if (accessToken && userId && deviceId && homeserverUrl) {
      initMatrixClient(homeserverUrl, accessToken, userId, deviceId)
        .then((client) => {
          registerEventHandlers(client);
          setRestoring(false);
        })
        .catch((err) => {
          console.error("Session restore failed:", err);
          useAuthStore.getState().logout();
        });
    }
  }, []);

  // Only show loading while the client is being created/restored.
  // Once we have a client, show the app so we never get a blank screen.
  // Room list will populate when sync completes (handled in event handlers).
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
