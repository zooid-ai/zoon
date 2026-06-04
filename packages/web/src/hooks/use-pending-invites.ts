import { ClientEvent, RoomEvent } from "matrix-js-sdk";
import { useSyncExternalStore } from "react";
import { MatrixClientPeg } from "../client/peg";

export interface PendingInvite {
  roomId: string;
  name: string;
  inviter: string | null;
  ts: number;
}

const EMPTY: PendingInvite[] = [];
let cached: PendingInvite[] = EMPTY;

function snapshot(): PendingInvite[] {
  const client = MatrixClientPeg.safeGet();
  const me = client?.getUserId();
  if (!client || !me) return EMPTY;

  const next = client
    .getRooms()
    .filter((r) => r.getMyMembership() === "invite")
    .map((r) => {
      const memberEvent = r.getMember(me)?.events?.member ?? null;
      return {
        roomId: r.roomId,
        name: r.name ?? r.roomId,
        inviter: memberEvent?.getSender() ?? null,
        ts: memberEvent?.getTs() ?? 0,
      };
    })
    .sort((a, b) => b.ts - a.ts);

  // Stable-identity cache so useSyncExternalStore doesn't loop.
  if (
    cached.length === next.length &&
    cached.every(
      (c, i) =>
        c.roomId === next[i].roomId &&
        c.name === next[i].name &&
        c.inviter === next[i].inviter &&
        c.ts === next[i].ts,
    )
  ) {
    return cached;
  }
  cached = next;
  return cached;
}

export function usePendingInvites(): PendingInvite[] {
  return useSyncExternalStore(
    (cb) => {
      const client = MatrixClientPeg.safeGet();
      if (!client) return MatrixClientPeg.subscribe(cb);
      const onChange = () => cb();
      client.on(ClientEvent.Room, onChange);
      client.on(RoomEvent.MyMembership, onChange);
      const unsubPeg = MatrixClientPeg.subscribe(cb);
      return () => {
        client.off(ClientEvent.Room, onChange);
        client.off(RoomEvent.MyMembership, onChange);
        unsubPeg();
      };
    },
    snapshot,
    () => EMPTY,
  );
}
