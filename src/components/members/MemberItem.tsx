import { Member } from "@/stores/memberStore";
import { usePresenceStore } from "@/stores/presenceStore";
import { Avatar } from "@/components/common/Avatar";

interface MemberItemProps {
  member: Member;
}

export function MemberItem({ member }: MemberItemProps) {
  const presence = usePresenceStore(
    (s) => s.presenceByUser.get(member.userId)?.presence ?? null
  );

  return (
    <div className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-bg-hover">
      <Avatar
        name={member.displayName}
        url={member.avatarUrl}
        size={32}
        presence={presence}
      />
      <span className="flex-1 truncate text-sm text-text-secondary">
        {member.displayName}
      </span>
    </div>
  );
}
