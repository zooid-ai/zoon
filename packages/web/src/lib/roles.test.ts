import { describe, expect, it } from "vitest";
import {
  ADMIN_LEVEL,
  DEFAULT_LEVEL,
  MODERATOR_LEVEL,
  type Role,
  levelForRole,
  roleForLevel,
  roleLabel,
  standardRoleOptions,
} from "./roles";

describe("roleForLevel", () => {
  it("maps the standard ladder to named roles", () => {
    expect(roleForLevel(100)).toEqual<Role>({ kind: "admin", level: 100 });
    expect(roleForLevel(50)).toEqual<Role>({ kind: "moderator", level: 50 });
    expect(roleForLevel(0)).toEqual<Role>({ kind: "default", level: 0 });
  });

  it("maps any non-standard value to a custom role preserving the level", () => {
    expect(roleForLevel(25)).toEqual<Role>({ kind: "custom", level: 25 });
    expect(roleForLevel(101)).toEqual<Role>({ kind: "custom", level: 101 });
  });
});

describe("roleLabel", () => {
  it("labels the standard roles", () => {
    expect(roleLabel(roleForLevel(100))).toBe("Admin");
    expect(roleLabel(roleForLevel(50))).toBe("Moderator");
    expect(roleLabel(roleForLevel(0))).toBe("Default");
  });

  it("renders Custom (N) for non-standard levels", () => {
    expect(roleLabel(roleForLevel(25))).toBe("Custom (25)");
  });
});

describe("levelForRole", () => {
  it("returns the canonical level for standard role kinds", () => {
    expect(levelForRole("admin")).toBe(ADMIN_LEVEL);
    expect(levelForRole("moderator")).toBe(MODERATOR_LEVEL);
    expect(levelForRole("default")).toBe(DEFAULT_LEVEL);
  });
});

describe("standardRoleOptions", () => {
  it("returns admin/moderator/default in descending order", () => {
    expect(standardRoleOptions().map((o) => o.kind)).toEqual([
      "admin",
      "moderator",
      "default",
    ]);
  });

  it("disables options above a viewer's own level", () => {
    // viewer at 50 may grant moderator/default, not admin
    const opts = standardRoleOptions(50);
    expect(opts.find((o) => o.kind === "admin")?.disabled).toBe(true);
    expect(opts.find((o) => o.kind === "moderator")?.disabled).toBe(false);
    expect(opts.find((o) => o.kind === "default")?.disabled).toBe(false);
  });
});
