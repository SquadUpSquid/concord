/**
 * Maps Matrix power levels to Discord-style role names and colors.
 * Matrix uses m.room.power_levels (0-100); we expose these as roles in the UI.
 */

export const POWER_LEVEL_OWNER = 100;
export const POWER_LEVEL_ADMIN = 50;
export const POWER_LEVEL_MODERATOR = 25;
export const POWER_LEVEL_MEMBER = 0;

export interface RoleInfo {
  name: string;
  /** Tailwind classes for badge, e.g. "bg-amber-500/25 text-amber-400" */
  colorClass: string;
  description: string;
  powerLevel: number;
}

const ROLE_TIERS: RoleInfo[] = [
  {
    name: "Owner",
    colorClass: "bg-yellow/20 text-yellow",
    description: "Full control. Can change all settings and assign roles.",
    powerLevel: POWER_LEVEL_OWNER,
  },
  {
    name: "Admin",
    colorClass: "bg-red/20 text-red",
    description: "Can manage channel, kick/ban, and assign Moderator/Member roles.",
    powerLevel: POWER_LEVEL_ADMIN,
  },
  {
    name: "Moderator",
    colorClass: "bg-accent/20 text-accent",
    description: "Can kick and ban members.",
    powerLevel: POWER_LEVEL_MODERATOR,
  },
  {
    name: "Member",
    colorClass: "bg-bg-active text-text-muted",
    description: "Can send messages and participate.",
    powerLevel: POWER_LEVEL_MEMBER,
  },
];

/** Get role info for a power level (highest tier the level satisfies). */
export function getRoleForPowerLevel(powerLevel: number): RoleInfo | null {
  for (const role of ROLE_TIERS) {
    if (powerLevel >= role.powerLevel) return role;
  }
  return null;
}

/** Display role name for badge, or null for Member (no badge). */
export function getRoleName(powerLevel: number): string | null {
  const role = getRoleForPowerLevel(powerLevel);
  if (!role || role.powerLevel === POWER_LEVEL_MEMBER) return null;
  return role.name;
}

/** All roles for assignable dropdown (Owner usually not reassignable). */
export function getAssignableRoles(): RoleInfo[] {
  return ROLE_TIERS;
}

/** Power level for a role name. */
export function getPowerLevelForRoleName(roleName: string): number {
  const r = ROLE_TIERS.find((t) => t.name.toLowerCase() === roleName.toLowerCase());
  return r?.powerLevel ?? POWER_LEVEL_MEMBER;
}
