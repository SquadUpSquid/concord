import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useRoomStore } from "@/stores/roomStore";
import { initMatrixClient, getMatrixClient, hydrateOwnProfile } from "@/lib/matrix";
import { registerEventHandlers } from "@/lib/matrixEventHandlers";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export function MainPage() {
  const [restoring, setRestoring] = useState(!getMatrixClient());
  const syncState = useRoomStore((s) => s.syncState);
  const setProfile = useAuthStore((s) => s.setProfile);
  const resetRoomState = useRoomStore((s) => s.resetState);

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
      .then(async (client) => {
        registerEventHandlers(client);
        const profile = await hydrateOwnProfile(client);
        setProfile(profile.displayName, profile.avatarUrl);
        setRestoring(false);
      })
      .catch((err) => {
        console.error("Session restore failed:", err);
        resetRoomState();
        useAuthStore.getState().logout();
      });
  }, [setProfile, resetRoomState]);

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
