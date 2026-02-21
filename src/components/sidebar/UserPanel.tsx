import { useAuthStore } from "@/stores/authStore";
import { usePresenceStore } from "@/stores/presenceStore";
import { useUiStore } from "@/stores/uiStore";
import { Avatar } from "@/components/common/Avatar";
import { getMatrixClient } from "@/lib/matrix";
import { mxcToHttp } from "@/utils/matrixHelpers";

export function UserPanel() {
  const userId = useAuthStore((s) => s.userId);
  const openModal = useUiStore((s) => s.openModal);
  const myPresence = usePresenceStore(
    (s) => s.presenceByUser.get(userId ?? "")?.presence ?? "online"
  );

  const client = getMatrixClient();
  const user = client?.getUser(userId ?? "");
  const displayName = user?.displayName ?? userId ?? "User";
  const avatarUrl = user && client
    ? mxcToHttp(user.avatarUrl ?? null, client.getHomeserverUrl())
    : null;
  const mxcAvatarUrl = user?.avatarUrl ?? null;

  return (
    <div className="flex items-center gap-3 border-t border-bg-tertiary bg-bg-floating/70 px-3 py-2.5">
      <button
        onClick={() => openModal("settings")}
        className="flex-shrink-0 cursor-pointer rounded-full transition-opacity hover:opacity-80"
        title="User settings"
      >
        <Avatar
          name={displayName}
          url={avatarUrl}
          mxcUrl={mxcAvatarUrl}
          size={38}
          presence={myPresence}
        />
      </button>

      <button
        onClick={() => openModal("settings")}
        className="flex flex-1 items-center gap-2 overflow-hidden rounded-md px-1 py-1 text-left hover:bg-bg-hover"
        title="User settings"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-semibold text-text-primary">
            {displayName}
          </p>
          <p className="truncate text-[0.72rem] text-text-muted">
            {userId}
          </p>
        </div>
        <svg className="h-4 w-4 flex-shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
    </div>
  );
}
