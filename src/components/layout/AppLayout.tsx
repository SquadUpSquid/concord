import { ServerSidebar } from "@/components/sidebar/ServerSidebar";
import { ChannelSidebar } from "@/components/sidebar/ChannelSidebar";
import { ChatView } from "@/components/chat/ChatView";
import { MemberSidebar } from "@/components/members/MemberSidebar";
import { useUiStore } from "@/stores/uiStore";

export function AppLayout() {
  const showMembers = useUiStore((s) => s.showMemberSidebar);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <ServerSidebar />
      <ChannelSidebar />
      <ChatView />
      {showMembers && <MemberSidebar />}
    </div>
  );
}
