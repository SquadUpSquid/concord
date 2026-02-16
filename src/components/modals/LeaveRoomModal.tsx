import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { useUiStore } from "@/stores/uiStore";
import { useRoomStore } from "@/stores/roomStore";
import { getMatrixClient } from "@/lib/matrix";

export function LeaveRoomModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const selectedRoomId = useRoomStore((s) => s.selectedRoomId);
  const rooms = useRoomStore((s) => s.rooms);
  const selectRoom = useRoomStore((s) => s.selectRoom);
  const contextMenu = useUiStore((s) => s.contextMenu);

  const targetRoomId = contextMenu?.roomId ?? selectedRoomId;
  const room = targetRoomId ? rooms.get(targetRoomId) : null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = async () => {
    const client = getMatrixClient();
    if (!client || !targetRoomId) return;

    setLoading(true);
    setError(null);

    try {
      await client.leave(targetRoomId);

      if (selectedRoomId === targetRoomId) {
        selectRoom(null);
      }

      closeModal();
    } catch (err) {
      console.error("Failed to leave room:", err);
      setError(err instanceof Error ? err.message : "Failed to leave room");
    } finally {
      setLoading(false);
    }
  };

  if (!room) return null;

  return (
    <Modal title="Leave Channel" onClose={closeModal}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Are you sure you want to leave{" "}
          <strong className="text-text-primary">{room.name}</strong>?
          You will need to be re-invited to rejoin a private channel.
        </p>

        {error && <p className="text-sm text-red">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={closeModal}
            className="rounded-sm px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleLeave}
            disabled={loading}
            className="rounded-sm bg-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red/80 disabled:opacity-50"
          >
            {loading ? "Leaving..." : "Leave Channel"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
