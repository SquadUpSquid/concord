import { useUiStore } from "@/stores/uiStore";
import { CreateRoomModal } from "./CreateRoomModal";
import { CreateSpaceModal } from "./CreateSpaceModal";
import { RoomSettingsModal } from "./RoomSettingsModal";
import { LeaveRoomModal } from "./LeaveRoomModal";

export function ModalRoot() {
  const activeModal = useUiStore((s) => s.activeModal);

  switch (activeModal) {
    case "createRoom":
      return <CreateRoomModal />;
    case "createSpace":
      return <CreateSpaceModal />;
    case "roomSettings":
      return <RoomSettingsModal />;
    case "leaveRoom":
      return <LeaveRoomModal />;
    default:
      return null;
  }
}
