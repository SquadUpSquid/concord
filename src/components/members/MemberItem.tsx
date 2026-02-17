import { Member } from "@/stores/memberStore";
import { usePresenceStore } from "@/stores/presenceStore";
import { Avatar } from "@/components/common/Avatar";
import { getRoleForPowerLevel, POWER_LEVEL_MEMBER } from "@/utils/roles";

interface MemberItemProps {
  member: Member;
}

export function MemberItem({ member }: MemberItemProps) {
  const presence = usePresenceStore(
    (s) => s.presenceByUser.get(member.userId)?.presence ?? null
  );
  const role = getRoleForPowerLevel(member.powerLevel);
  const showRoleBadge = role && role.powerLevel !== POWER_LEVEL_MEMBER;

  return (
    <div className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-bg-hover">
      <Avatar
        name={member.displayName}
        url={member.avatarUrl}
        size={32}
        presence={presence}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm text-text-secondary">
            {member.displayName}
          </span>
          {showRoleBadge && (
            <span
              className={`flex-shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold ${role.colorClass}`}
              title={role.description}
            >
              {role.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
