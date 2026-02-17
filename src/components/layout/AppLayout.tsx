import { useState, useEffect } from "react";
import { ServerSidebar } from "@/components/sidebar/ServerSidebar";
import { ChannelSidebar } from "@/components/sidebar/ChannelSidebar";
import { ChatView } from "@/components/chat/ChatView";
import { MemberSidebar } from "@/components/members/MemberSidebar";
import { TitleBar } from "./TitleBar";
import { useUiStore } from "@/stores/uiStore";
import { ModalRoot } from "@/components/modals/ModalRoot";
import { RoomContextMenu } from "@/components/sidebar/RoomContextMenu";
import { QuickSwitcher } from "@/components/common/QuickSwitcher";

export function AppLayout() {
  const showMembers = useUiStore((s) => s.showMemberSidebar);
  const [showSwitcher, setShowSwitcher] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSwitcher((s) => !s);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <ServerSidebar />
        <ChannelSidebar />
        <ChatView />
        {showMembers && <MemberSidebar />}
      </div>
      <ModalRoot />
      <RoomContextMenu />
      {showSwitcher && <QuickSwitcher onClose={() => setShowSwitcher(false)} />}
    </div>
  );
}
