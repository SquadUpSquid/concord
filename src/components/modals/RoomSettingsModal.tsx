import { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { useUiStore } from "@/stores/uiStore";
import { useRoomStore } from "@/stores/roomStore";
import { useAuthStore } from "@/stores/authStore";
import { getMatrixClient } from "@/lib/matrix";

export function RoomSettingsModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);
  const selectedRoomId = useRoomStore((s) => s.selectedRoomId);
  const rooms = useRoomStore((s) => s.rooms);
  const userId = useAuthStore((s) => s.userId);

  const room = selectedRoomId ? rooms.get(selectedRoomId) : null;

  const [name, setName] = useState(room?.name ?? "");
  const [topic, setTopic] = useState(room?.topic ?? "");
  const [inviteUserId, setInviteUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const client = getMatrixClient();
    if (!client || !selectedRoomId || !userId) return;
    const matrixRoom = client.getRoom(selectedRoomId);
    if (!matrixRoom) return;

    const powerLevels = matrixRoom.currentState
      .getStateEvents("m.room.power_levels", "")
      ?.getContent();

    const userPower = powerLevels?.users?.[userId] ?? powerLevels?.users_default ?? 0;
    const requiredPower = powerLevels?.events?.["m.room.name"] ?? powerLevels?.state_default ?? 50;

    setCanEdit(userPower >= requiredPower);
  }, [selectedRoomId, userId]);

  const handleSave = async () => {
    const client = getMatrixClient();
    if (!client || !selectedRoomId) return;

    setSaving(true);
    setError(null);

    try {
      if (name.trim() !== room?.name) {
        await client.setRoomName(selectedRoomId, name.trim());
      }
      if (topic.trim() !== (room?.topic ?? "")) {
        await client.setRoomTopic(selectedRoomId, topic.trim());
      }
      closeModal();
    } catch (err) {
      console.error("Failed to update room:", err);
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    const client = getMatrixClient();
    if (!client || !selectedRoomId || !inviteUserId.trim()) return;

    setInviting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await client.invite(selectedRoomId, inviteUserId.trim());
      setSuccessMsg(`Invited ${inviteUserId.trim()}`);
      setInviteUserId("");
    } catch (err) {
      console.error("Failed to invite:", err);
      setError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setInviting(false);
    }
  };

  if (!room) return null;

  const hasChanges = name.trim() !== room.name || topic.trim() !== (room.topic ?? "");

  return (
    <Modal title="Channel Settings" onClose={closeModal}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            Channel Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={!canEdit}
            placeholder="No topic set"
            className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          />
        </div>

        {canEdit && hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="self-end rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}

        <div className="h-px bg-bg-active" />

        <div>
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            Invite User
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              placeholder="@user:matrix.org"
              className="flex-1 rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteUserId.trim()}
              className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {inviting ? "..." : "Invite"}
            </button>
          </div>
        </div>

        <div className="h-px bg-bg-active" />

        <button
          onClick={() => openModal("leaveRoom")}
          className="self-start rounded-sm px-4 py-2 text-sm font-medium text-red hover:bg-red/10"
        >
          Leave Channel
        </button>

        {error && <p className="text-sm text-red">{error}</p>}
        {successMsg && <p className="text-sm text-green">{successMsg}</p>}
      </div>
    </Modal>
  );
}
