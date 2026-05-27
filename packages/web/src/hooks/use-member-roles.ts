import { EventType, type Room, type RoomMember, RoomStateEvent } from "matrix-js-sdk";
import { useSyncExternalStore } from "react";
import { MatrixClientPeg } from "../client/peg";
import { type Role, roleForLevel } from "../lib/roles";

export interface MemberRole {
  userId: string;
  displayName: string;
  powerLevel: number;
  role: Role;
}

export type MemberGroupKind = "admin" | "moderator" | "member";

export interface MemberRoleGroup {
  kind: MemberGroupKind;
  label: string;
  members: MemberRole[];
}

const GROUP_ORDER: { kind: MemberGroupKind; label: string }[] = [
  { kind: "admin", label: "Admins" },
  { kind: "moderator", label: "Moderators" },
  { kind: "member", label: "Members" },
];

// Bucket members into Admins / Moderators / Members (default + custom fold into
// Members), each sorted by power level descending then display name. Empty
// groups are omitted.
export function groupMembersByRole(members: MemberRole[]): MemberRoleGroup[] {
  const buckets: Record<MemberGroupKind, MemberRole[]> = {
    admin: [],
    moderator: [],
    member: [],
  };
  for (const m of members) {
    const kind: MemberGroupKind =
      m.role.kind === "admin" ? "admin" : m.role.kind === "moderator" ? "moderator" : "member";
    buckets[kind].push(m);
  }
  const byRank = (a: MemberRole, b: MemberRole) =>
    b.powerLevel - a.powerLevel || a.displayName.localeCompare(b.displayName);
  return GROUP_ORDER.filter(({ kind }) => buckets[kind].length > 0).map(({ kind, label }) => ({
    kind,
    label,
    members: buckets[kind].sort(byRank),
  }));
}

const EMPTY: MemberRole[] = [];

interface CacheEntry {
  members: RoomMember[];
  plEvent: unknown;
  result: MemberRole[];
}
const cache = new WeakMap<Room, CacheEntry>();

function snapshot(roomId: string): MemberRole[] {
  const room = MatrixClientPeg.safeGet()?.getRoom(roomId);
  if (!room) return EMPTY;

  // getJoinedMembers() returns a fresh array each call; compare element-wise
  // (RoomMember references are stable) so useSyncExternalStore sees a stable
  // snapshot and doesn't loop.
  const members = room.getJoinedMembers();
  const plEvent = room.currentState.getStateEvents(EventType.RoomPowerLevels, "") ?? null;

  const cached = cache.get(room);
  if (
    cached &&
    cached.plEvent === plEvent &&
    cached.members.length === members.length &&
    cached.members.every((m, i) => m === members[i])
  ) {
    return cached.result;
  }

  const pl = (plEvent?.getContent() ?? {}) as {
    users?: Record<string, number>;
    users_default?: number;
  };
  const usersDefault = pl.users_default ?? 0;

  const result: MemberRole[] = members.map((m) => {
    const powerLevel = pl.users?.[m.userId] ?? usersDefault;
    return {
      userId: m.userId,
      displayName: m.name,
      powerLevel,
      role: roleForLevel(powerLevel),
    };
  });

  cache.set(room, { members, plEvent, result });
  return result;
}

export function useMemberRoles(roomId: string): MemberRole[] {
  return useSyncExternalStore(
    (cb) => {
      const client = MatrixClientPeg.safeGet();
      const room = client?.getRoom(roomId);
      if (!room) return MatrixClientPeg.subscribe(cb);
      const onChange = () => cb();
      // Members change AND power_levels (a state event) change the result.
      room.currentState.on(RoomStateEvent.Members, onChange);
      room.currentState.on(RoomStateEvent.Events, onChange);
      const unsubPeg = MatrixClientPeg.subscribe(cb);
      return () => {
        room.currentState.off(RoomStateEvent.Members, onChange);
        room.currentState.off(RoomStateEvent.Events, onChange);
        unsubPeg();
      };
    },
    () => snapshot(roomId),
    () => EMPTY,
  );
}
