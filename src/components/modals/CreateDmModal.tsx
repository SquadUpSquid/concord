import { useState, useCallback, useRef, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { Avatar } from "@/components/common/Avatar";
import { useUiStore } from "@/stores/uiStore";
import { useRoomStore } from "@/stores/roomStore";
import { getMatrixClient } from "@/lib/matrix";
import { mxcToHttp } from "@/utils/matrixHelpers";
import { Preset } from "matrix-js-sdk";

interface SearchResult {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  mxcAvatarUrl: string | null;
}

export function CreateDmModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const selectRoom = useRoomStore((s) => s.selectRoom);
  const selectSpace = useRoomStore((s) => s.selectSpace);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const searchUsers = useCallback(async (term: string) => {
    const client = getMatrixClient();
    if (!client || !term.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const response = await (client as any).searchUserDirectory({ term: term.trim(), limit: 10 });
      const hsUrl = client.getHomeserverUrl();
      setResults(
        response.results.map((u: { user_id: string; display_name?: string; avatar_url?: string }) => ({
          userId: u.user_id,
          displayName: u.display_name ?? null,
          avatarUrl: mxcToHttp(u.avatar_url, hsUrl),
          mxcAvatarUrl: u.avatar_url ?? null,
        }))
      );
    } catch (err) {
      console.error("User search failed:", err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => searchUsers(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchUsers]);

  const handleStartDm = async (userId: string) => {
    const client = getMatrixClient();
    if (!client || creating) return;

    setCreating(true);
    setError(null);

    try {
      // Check if a DM already exists with this user
      const existingRooms = client.getRooms();
      for (const room of existingRooms) {
        const members = room.getJoinedMembers();
        if (
          members.length === 2 &&
          members.some((m) => m.userId === userId) &&
          !room.isSpaceRoom()
        ) {
          closeModal();
          selectSpace(null);
          selectRoom(room.roomId);
          return;
        }
      }

      // Create new DM room
      const { room_id } = await client.createRoom({
        preset: Preset.TrustedPrivateChat,
        invite: [userId],
        is_direct: true,
        initial_state: [
          {
            type: "m.room.encryption",
            state_key: "",
            content: { algorithm: "m.megolm.v1.aes-sha2" },
          },
        ],
      });

      // Mark as DM in account data
      const dmMap: Record<string, string[]> =
        ((client as any).getAccountData("m.direct")?.getContent() as Record<string, string[]>) ?? {};
      dmMap[userId] = [...(dmMap[userId] ?? []), room_id];
      await (client as any).setAccountData("m.direct", dmMap);

      closeModal();
      selectSpace(null);
      selectRoom(room_id);
    } catch (err) {
      console.error("Failed to create DM:", err);
      setError(err instanceof Error ? err.message : "Failed to create DM");
    } finally {
      setCreating(false);
    }
  };

  const handleDirectInput = async () => {
    const trimmed = query.trim();
    if (!trimmed.startsWith("@") || !trimmed.includes(":")) return;
    await handleStartDm(trimmed);
  };

  return (
    <Modal title="New Direct Message" onClose={closeModal}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            Find a user
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDirectInput()}
            placeholder="@username:server.com or search..."
            className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
            autoFocus
          />
          <p className="mt-1 text-[10px] text-text-muted">
            Enter a full Matrix ID or search by name
          </p>
        </div>

        {/* Search results */}
        <div className="max-h-60 overflow-y-auto">
          {searching && (
            <p className="py-4 text-center text-xs text-text-muted">Searching...</p>
          )}

          {!searching && results.length === 0 && query.trim().length > 0 && (
            <p className="py-4 text-center text-xs text-text-muted">
              No users found. Try a full Matrix ID like @user:server.com
            </p>
          )}

          {results.map((user) => (
            <button
              key={user.userId}
              onClick={() => handleStartDm(user.userId)}
              disabled={creating}
              className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors hover:bg-bg-hover disabled:opacity-50"
            >
              <Avatar
                name={user.displayName ?? user.userId}
                url={user.avatarUrl}
                mxcUrl={user.mxcAvatarUrl}
                size={36}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {user.displayName ?? user.userId}
                </p>
                <p className="truncate text-xs text-text-muted">{user.userId}</p>
              </div>
              <svg className="h-4 w-4 flex-shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <div className="flex justify-end pt-1">
          <button
            onClick={closeModal}
            className="rounded-sm px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
