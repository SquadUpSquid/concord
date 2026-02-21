import { useState, useEffect, Component, ReactNode } from "react";
import { ServerSidebar } from "@/components/sidebar/ServerSidebar";
import { ChannelSidebar } from "@/components/sidebar/ChannelSidebar";
import { ChatView } from "@/components/chat/ChatView";
import { MemberSidebar } from "@/components/members/MemberSidebar";
import { TitleBar } from "./TitleBar";
import { useUiStore } from "@/stores/uiStore";
import { ModalRoot } from "@/components/modals/ModalRoot";
import { RoomContextMenu } from "@/components/sidebar/RoomContextMenu";
import { UserPanel } from "@/components/sidebar/UserPanel";
import { QuickSwitcher } from "@/components/common/QuickSwitcher";
import { SessionVerificationBanner } from "@/components/verification/SessionVerificationBanner";
import { VerificationFlowModal } from "@/components/verification/VerificationFlowModal";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useSettingsStore } from "@/stores/settingsStore";

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
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);

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
      <SectionGuard name="TitleBar">
        <TitleBar />
      </SectionGuard>
      <SectionGuard name="VerificationBanner">
        <SessionVerificationBanner />
      </SectionGuard>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-col bg-bg-secondary">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <SectionGuard name="ServerSidebar">
              <ServerSidebar />
            </SectionGuard>
            <SectionGuard name="ChannelSidebar">
              <ChannelSidebar />
            </SectionGuard>
          </div>
          <SectionGuard name="UserPanel">
            <UserPanel />
          </SectionGuard>
        </div>
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
        <VerificationFlowModal />
      </SectionGuard>
      <RoomContextMenu />
      {showSwitcher && <QuickSwitcher onClose={() => setShowSwitcher(false)} />}
      {!onboardingCompleted && <OnboardingWizard />}
    </div>
  );
}
