export const ADMIN_LEVEL = 100;
export const MODERATOR_LEVEL = 50;
export const DEFAULT_LEVEL = 0;

export type RoleKind = "admin" | "moderator" | "default" | "custom";

export interface Role {
  kind: RoleKind;
  level: number;
}

export function roleForLevel(level: number): Role {
  if (level === ADMIN_LEVEL) return { kind: "admin", level };
  if (level === MODERATOR_LEVEL) return { kind: "moderator", level };
  if (level === DEFAULT_LEVEL) return { kind: "default", level };
  return { kind: "custom", level };
}

export function roleLabel(role: Role): string {
  switch (role.kind) {
    case "admin":
      return "Admin";
    case "moderator":
      return "Moderator";
    case "default":
      return "Default";
    case "custom":
      return `Custom (${role.level})`;
  }
}

export function levelForRole(kind: "admin" | "moderator" | "default"): number {
  switch (kind) {
    case "admin":
      return ADMIN_LEVEL;
    case "moderator":
      return MODERATOR_LEVEL;
    case "default":
      return DEFAULT_LEVEL;
  }
}

export interface RoleOption {
  kind: "admin" | "moderator" | "default";
  level: number;
  label: string;
  disabled: boolean;
}

// The three standard roles in descending order. When `viewerLevel` is given,
// any option above it is disabled (Rule 9: cannot grant above your own level).
export function standardRoleOptions(viewerLevel = Infinity): RoleOption[] {
  return (["admin", "moderator", "default"] as const).map((kind) => {
    const level = levelForRole(kind);
    return { kind, level, label: roleLabel({ kind, level }), disabled: level > viewerLevel };
  });
}
