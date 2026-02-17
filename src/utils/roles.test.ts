import { describe, it, expect } from "vitest";
import {
  getRoleForPowerLevel,
  getPowerLevelForRoleName,
  getRoleName,
  getAssignableRoles,
  POWER_LEVEL_OWNER,
  POWER_LEVEL_ADMIN,
  POWER_LEVEL_MODERATOR,
  POWER_LEVEL_MEMBER,
} from "./roles";

describe("roles", () => {
  it("getRoleForPowerLevel returns Owner for 100", () => {
    const role = getRoleForPowerLevel(POWER_LEVEL_OWNER);
    expect(role?.name).toBe("Owner");
    expect(role?.powerLevel).toBe(100);
  });

  it("getRoleForPowerLevel returns Admin for 50", () => {
    const role = getRoleForPowerLevel(POWER_LEVEL_ADMIN);
    expect(role?.name).toBe("Admin");
  });

  it("getRoleForPowerLevel returns Moderator for 25", () => {
    const role = getRoleForPowerLevel(POWER_LEVEL_MODERATOR);
    expect(role?.name).toBe("Moderator");
  });

  it("getRoleForPowerLevel returns Member for 0", () => {
    const role = getRoleForPowerLevel(POWER_LEVEL_MEMBER);
    expect(role?.name).toBe("Member");
  });

  it("getRoleForPowerLevel returns highest tier for in-between levels", () => {
    expect(getRoleForPowerLevel(75)?.name).toBe("Admin");
    expect(getRoleForPowerLevel(30)?.name).toBe("Moderator");
  });

  it("getPowerLevelForRoleName maps role names to levels", () => {
    expect(getPowerLevelForRoleName("Owner")).toBe(100);
    expect(getPowerLevelForRoleName("Admin")).toBe(50);
    expect(getPowerLevelForRoleName("Moderator")).toBe(25);
    expect(getPowerLevelForRoleName("Member")).toBe(0);
  });

  it("getPowerLevelForRoleName is case-insensitive", () => {
    expect(getPowerLevelForRoleName("admin")).toBe(50);
    expect(getPowerLevelForRoleName("MODERATOR")).toBe(25);
  });

  it("getPowerLevelForRoleName returns Member level for unknown", () => {
    expect(getPowerLevelForRoleName("Unknown")).toBe(0);
  });

  it("getRoleName returns null for Member level", () => {
    expect(getRoleName(POWER_LEVEL_MEMBER)).toBeNull();
  });

  it("getRoleName returns name for non-Member levels", () => {
    expect(getRoleName(POWER_LEVEL_OWNER)).toBe("Owner");
    expect(getRoleName(POWER_LEVEL_ADMIN)).toBe("Admin");
  });

  it("getAssignableRoles returns all four roles", () => {
    const roles = getAssignableRoles();
    expect(roles).toHaveLength(4);
    expect(roles.map((r) => r.name)).toEqual(["Owner", "Admin", "Moderator", "Member"]);
  });
});
