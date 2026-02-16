import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { useUiStore } from "@/stores/uiStore";
import { useRoomStore } from "@/stores/roomStore";
import { useAuthStore } from "@/stores/authStore";
import { getMatrixClient } from "@/lib/matrix";
import { Visibility, Preset } from "matrix-js-sdk";

export function CreateRoomModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const selectedSpaceId = useRoomStore((s) => s.selectedSpaceId);
  const selectRoom = useRoomStore((s) => s.selectRoom);
  const homeserverUrl = useAuthStore((s) => s.homeserverUrl);

  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [encrypted, setEncrypted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const client = getMatrixClient();
    if (!client) return;

    setLoading(true);
    setError(null);

    try {
      const initialState: { type: string; state_key: string; content: Record<string, unknown> }[] = [];
      if (encrypted) {
        initialState.push({
          type: "m.room.encryption",
          state_key: "",
          content: { algorithm: "m.megolm.v1.aes-sha2" },
        });
      }

      const { room_id } = await client.createRoom({
        name: name.trim(),
        topic: topic.trim() || undefined,
        visibility: isPublic ? Visibility.Public : Visibility.Private,
        preset: isPublic ? Preset.PublicChat : Preset.PrivateChat,
        initial_state: initialState,
      });

      // If a space is selected, add room as child of that space
      if (selectedSpaceId && homeserverUrl) {
        const homeserver = new URL(homeserverUrl).hostname;
        await client.sendStateEvent(
          selectedSpaceId,
          "m.space.child" as any,
          { via: [homeserver] },
          room_id,
        );
      }

      closeModal();
      selectRoom(room_id);
    } catch (err) {
      console.error("Failed to create room:", err);
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create Channel" onClose={closeModal}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            Channel Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="new-channel"
            className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            Topic (optional)
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What is this channel about?"
            className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Private Channel</p>
            <p className="text-xs text-text-muted">Only invited members can join</p>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              !isPublic ? "bg-accent" : "bg-bg-active"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                !isPublic ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Enable Encryption</p>
            <p className="text-xs text-text-muted">Cannot be disabled once enabled</p>
          </div>
          <button
            onClick={() => setEncrypted(!encrypted)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              encrypted ? "bg-accent" : "bg-bg-active"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                encrypted ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={closeModal}
            className="rounded-sm px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Channel"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
