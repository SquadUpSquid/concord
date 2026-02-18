import { useUiStore } from "@/stores/uiStore";
import { CreateRoomModal } from "./CreateRoomModal";
import { CreateSpaceModal } from "./CreateSpaceModal";
import { RoomSettingsModal } from "./RoomSettingsModal";
import { SpaceSettingsModal } from "./SpaceSettingsModal";
import { LeaveRoomModal } from "./LeaveRoomModal";
import { CreateDmModal } from "./CreateDmModal";
import { UserSettingsModal } from "./UserSettingsModal";
import { SettingsPage } from "@/components/settings/SettingsPage";

export function ModalRoot() {
  const activeModal = useUiStore((s) => s.activeModal);

  switch (activeModal) {
    case "createRoom":
      return <CreateRoomModal />;
    case "createSpace":
      return <CreateSpaceModal />;
    case "roomSettings":
      return <RoomSettingsModal />;
    case "spaceSettings":
      return <SpaceSettingsModal />;
    case "leaveRoom":
      return <LeaveRoomModal />;
    case "createDm":
      return <CreateDmModal />;
    case "userSettings":
      return <UserSettingsModal />;
    case "settings":
      return <SettingsPage />;
    default:
      return null;
  }
}
