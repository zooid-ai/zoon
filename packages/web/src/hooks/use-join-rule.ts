import { type MatrixEvent, RoomStateEvent } from "matrix-js-sdk";
import { useSyncExternalStore } from "react";
import { MatrixClientPeg } from "../client/peg";
import { useSpaceName } from "./use-space-name";

export type JoinRule = "invite" | "restricted" | "public";

interface JoinRuleState {
  rule: JoinRule;
  spaceId: string | null;
}

const EMPTY: JoinRuleState = { rule: "invite", spaceId: null };
const cache = new Map<string, { event: MatrixEvent | null; result: JoinRuleState }>();

function snapshot(roomId: string): JoinRuleState {
  const room = MatrixClientPeg.safeGet()?.getRoom(roomId);
  if (!room) return EMPTY;
  const event = room.currentState.getStateEvents("m.room.join_rules", "") ?? null;
  const cached = cache.get(roomId);
  if (cached && cached.event === event) return cached.result;

  const content =
    (event?.getContent() as {
      join_rule?: JoinRule;
      allow?: { type?: string; room_id?: string }[];
    } | null) ?? null;
  const rule = content?.join_rule ?? "invite";
  const spaceId =
    rule === "restricted"
      ? content?.allow?.find((a) => a.type === "m.room_membership")?.room_id ?? null
      : null;
  const result: JoinRuleState = { rule, spaceId };
  cache.set(roomId, { event, result });
  return result;
}

export function useJoinRule(roomId: string): { rule: JoinRule; spaceName: string | null } {
  const state = useSyncExternalStore(
    (cb) => {
      const client = MatrixClientPeg.safeGet();
      const room = client?.getRoom(roomId);
      if (!room) return MatrixClientPeg.subscribe(cb);
      const onState = () => cb();
      room.currentState.on(RoomStateEvent.Events, onState);
      const unsubPeg = MatrixClientPeg.subscribe(cb);
      return () => {
        room.currentState.off(RoomStateEvent.Events, onState);
        unsubPeg();
      };
    },
    () => snapshot(roomId),
    () => EMPTY,
  );
  const spaceName = useSpaceName(state.spaceId);
  return { rule: state.rule, spaceName };
}
