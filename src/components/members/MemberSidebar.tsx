import { useRoomStore } from "@/stores/roomStore";
import { useMemberStore } from "@/stores/memberStore";
import { MemberItem } from "./MemberItem";

const EMPTY_MEMBERS: import("@/stores/memberStore").Member[] = [];

export function MemberSidebar() {
  const selectedRoomId = useRoomStore((s) => s.selectedRoomId);
  const members = useMemberStore(
    (s) => (selectedRoomId ? s.membersByRoom.get(selectedRoomId) : null) ?? EMPTY_MEMBERS
  );

  const sorted = [...members].sort((a, b) => {
    if (a.powerLevel !== b.powerLevel) return b.powerLevel - a.powerLevel;
    return a.displayName.localeCompare(b.displayName);
  });

  const admins = sorted.filter((m) => m.powerLevel >= 50);
  const regular = sorted.filter((m) => m.powerLevel < 50);

  return (
    <div className="flex w-60 flex-col bg-bg-secondary">
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {admins.length > 0 && (
          <>
            <h4 className="mb-1 px-2 text-xs font-semibold uppercase text-text-muted">
              Admins &mdash; {admins.length}
            </h4>
            {admins.map((m) => (
              <MemberItem key={m.userId} member={m} />
            ))}
          </>
        )}

        {regular.length > 0 && (
          <>
            <h4 className="mb-1 mt-4 px-2 text-xs font-semibold uppercase text-text-muted">
              Members &mdash; {regular.length}
            </h4>
            {regular.map((m) => (
              <MemberItem key={m.userId} member={m} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
