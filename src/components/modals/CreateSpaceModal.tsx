import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { useUiStore } from "@/stores/uiStore";
import { useRoomStore } from "@/stores/roomStore";
import { getMatrixClient } from "@/lib/matrix";
import { Visibility, Preset } from "matrix-js-sdk";

export function CreateSpaceModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const selectSpace = useRoomStore((s) => s.selectSpace);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const client = getMatrixClient();
    if (!client) return;

    setLoading(true);
    setError(null);

    try {
      const { room_id } = await client.createRoom({
        name: name.trim(),
        visibility: Visibility.Private,
        preset: Preset.PrivateChat,
        creation_content: { type: "m.space" } as any,
        power_level_content_override: { events_default: 0 },
      });

      closeModal();
      selectSpace(room_id);
    } catch (err) {
      console.error("Failed to create space:", err);
      setError(err instanceof Error ? err.message : "Failed to create space");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create Space" onClose={closeModal}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            Space Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="My Space"
            className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
            autoFocus
          />
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
            {loading ? "Creating..." : "Create Space"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
