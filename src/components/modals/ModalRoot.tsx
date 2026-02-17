import { useUiStore } from "@/stores/uiStore";
import { CreateRoomModal } from "./CreateRoomModal";
import { CreateSpaceModal } from "./CreateSpaceModal";
import { RoomSettingsModal } from "./RoomSettingsModal";
import { LeaveRoomModal } from "./LeaveRoomModal";
import { CreateDmModal } from "./CreateDmModal";
import { UserSettingsModal } from "./UserSettingsModal";

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
    case "createDm":
      return <CreateDmModal />;
    case "userSettings":
      return <UserSettingsModal />;
    default:
      return null;
  }
}
