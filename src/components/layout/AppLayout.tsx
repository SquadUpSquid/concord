import { useState, useEffect, Component, ReactNode } from "react";
import { ServerSidebar } from "@/components/sidebar/ServerSidebar";
import { ChannelSidebar } from "@/components/sidebar/ChannelSidebar";
import { ChatView } from "@/components/chat/ChatView";
import { MemberSidebar } from "@/components/members/MemberSidebar";
import { TitleBar } from "./TitleBar";
import { useUiStore } from "@/stores/uiStore";
import { ModalRoot } from "@/components/modals/ModalRoot";
import { RoomContextMenu } from "@/components/sidebar/RoomContextMenu";
import { QuickSwitcher } from "@/components/common/QuickSwitcher";

/**
 * Lightweight error boundary that silently swallows render errors in a
 * section so the rest of the app keeps working.
 */
class SectionGuard extends Component<
  { name: string; children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`[${this.props.name}] render error:`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-1 p-4 text-xs text-text-muted">
          <span>{this.props.name} failed to load</span>
          <span className="max-w-[200px] break-all text-red">
            {this.state.error.message}
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppLayout() {
  const showMembers = useUiStore((s) => s.showMemberSidebar);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [visible, setVisible] = useState(false);

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

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <SectionGuard name="TitleBar">
        <TitleBar />
      </SectionGuard>
      <div className="flex flex-1 overflow-hidden">
        <SectionGuard name="ServerSidebar">
          <ServerSidebar />
        </SectionGuard>
        <SectionGuard name="ChannelSidebar">
          <ChannelSidebar />
        </SectionGuard>
        <SectionGuard name="ChatView">
          <ChatView />
        </SectionGuard>
        {showMembers && (
          <SectionGuard name="MemberSidebar">
            <MemberSidebar />
          </SectionGuard>
        )}
      </div>
      <SectionGuard name="Modals">
        <ModalRoot />
      </SectionGuard>
      <RoomContextMenu />
      {showSwitcher && <QuickSwitcher onClose={() => setShowSwitcher(false)} />}
    </div>
  );
}
