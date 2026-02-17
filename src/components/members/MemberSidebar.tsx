import { useRoomStore } from "@/stores/roomStore";
import { useMemberStore } from "@/stores/memberStore";
import { MemberItem } from "./MemberItem";
import {
  POWER_LEVEL_OWNER,
  POWER_LEVEL_ADMIN,
  POWER_LEVEL_MODERATOR,
} from "@/utils/roles";

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

  const owners = sorted.filter((m) => m.powerLevel >= POWER_LEVEL_OWNER);
  const admins = sorted.filter(
    (m) => m.powerLevel >= POWER_LEVEL_ADMIN && m.powerLevel < POWER_LEVEL_OWNER
  );
  const moderators = sorted.filter(
    (m) => m.powerLevel >= POWER_LEVEL_MODERATOR && m.powerLevel < POWER_LEVEL_ADMIN
  );
  const regular = sorted.filter((m) => m.powerLevel < POWER_LEVEL_MODERATOR);

  const sections: { title: string; list: typeof sorted }[] = [
    { title: "Owner", list: owners },
    { title: "Admins", list: admins },
    { title: "Moderators", list: moderators },
    { title: "Members", list: regular },
  ];

  return (
    <div className="flex w-60 flex-col bg-bg-secondary">
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {sections.map(
          (s, i) =>
            s.list.length > 0 && (
              <div key={s.title} className={i > 0 ? "mt-4" : ""}>
                <h4 className="mb-1 px-2 text-xs font-semibold uppercase text-text-muted">
                  {s.title} &mdash; {s.list.length}
                </h4>
                {s.list.map((m) => (
                  <MemberItem key={m.userId} member={m} />
                ))}
              </div>
            )
        )}
      </div>
    </div>
  );
}
