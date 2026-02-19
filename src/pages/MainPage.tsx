import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useRoomStore } from "@/stores/roomStore";
import { initMatrixClient, getMatrixClient } from "@/lib/matrix";
import { registerEventHandlers } from "@/lib/matrixEventHandlers";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export function MainPage() {
  const [restoring, setRestoring] = useState(!getMatrixClient());
  const syncState = useRoomStore((s) => s.syncState);

  useEffect(() => {
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

    initMatrixClient(homeserverUrl, accessToken, userId, deviceId)
      .then((client) => {
        registerEventHandlers(client);
        setRestoring(false);
      })
      .catch((err) => {
        console.error("Session restore failed:", err);
        useAuthStore.getState().logout();
      });
  }, []);

  const clientReady = !restoring;
  const synced = syncState === "PREPARED";

  if (!clientReady || !synced) {
    const message = restoring ? "Connecting to Matrix..." : "Syncing...";
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-tertiary">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner />
          <p className="text-text-muted">{message}</p>
        </div>
      </div>
    );
  }

  return <AppLayout />;
}
