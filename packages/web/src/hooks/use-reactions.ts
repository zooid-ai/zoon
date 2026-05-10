import { RoomEvent } from "matrix-js-sdk";
import { useSyncExternalStore } from "react";
import { MatrixClientPeg } from "../client/peg";

export interface ReactionCount {
  count: number;
  mine: boolean;
  myEventId: string | undefined;
}

export type ReactionMap = Map<string, ReactionCount>;

const EMPTY: ReactionMap = new Map();

const cache = new Map<string, ReactionMap>();

function key(roomId: string, eventId: string) {
  return `${roomId} ${eventId}`;
}

function eq(a: ReactionMap, b: ReactionMap): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    const o = b.get(k);
    if (!o || o.count !== v.count || o.mine !== v.mine || o.myEventId !== v.myEventId) {
      return false;
    }
  }
  return true;
}

function snapshot(roomId: string, eventId: string): ReactionMap {
  const ck = key(roomId, eventId);
  const cached = cache.get(ck) ?? EMPTY;
  const client = MatrixClientPeg.safeGet();
  const room = client?.getRoom(roomId);
  if (!client || !room) {
    if (cached !== EMPTY) cache.set(ck, EMPTY);
    return EMPTY;
  }
  const me = client.getSafeUserId();
  const next: ReactionMap = new Map();
  const events = room.getLiveTimeline().getEvents();
  for (const ev of events) {
    if (ev.getType() !== "m.reaction") continue;
    if ((ev as unknown as { isRedacted?: () => boolean }).isRedacted?.()) continue;
    const c = ev.getContent() as {
      "m.relates_to"?: { rel_type?: string; event_id?: string; key?: string };
    };
    const rel = c["m.relates_to"];
    if (rel?.rel_type !== "m.annotation") continue;
    if (rel.event_id !== eventId) continue;
    const emoji = rel.key ?? "";
    if (!emoji) continue;
    const sender = ev.getSender();
    const existing = next.get(emoji) ?? { count: 0, mine: false, myEventId: undefined };
    existing.count += 1;
    if (sender === me) {
      existing.mine = true;
      existing.myEventId = ev.getId() ?? existing.myEventId;
    }
    next.set(emoji, existing);
  }
  if (eq(cached, next)) return cached;
  cache.set(ck, next);
  return next;
}

export function useReactions(roomId: string, eventId: string): ReactionMap {
  return useSyncExternalStore(
    (cb) => {
      const client = MatrixClientPeg.safeGet();
      const room = client?.getRoom(roomId);
      if (!room) return MatrixClientPeg.subscribe(cb);
      const onChange = () => cb();
      room.on(RoomEvent.Timeline, onChange);
      room.on(RoomEvent.Redaction, onChange);
      const unsubPeg = MatrixClientPeg.subscribe(cb);
      return () => {
        room.off(RoomEvent.Timeline, onChange);
        room.off(RoomEvent.Redaction, onChange);
        unsubPeg();
      };
    },
    () => snapshot(roomId, eventId),
    () => EMPTY,
  );
}
