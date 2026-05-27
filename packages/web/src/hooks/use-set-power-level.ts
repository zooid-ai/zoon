import { EventType } from "matrix-js-sdk";
import { useCallback } from "react";
import { MatrixClientPeg } from "../client/peg";

interface PowerLevelContent {
  users?: Record<string, number>;
  users_default?: number;
  state_default?: number;
  events?: Record<string, number>;
}

const PL_TYPE = "m.room.power_levels";

function readContext(roomId: string) {
  const client = MatrixClientPeg.safeGet();
  const room = client?.getRoom(roomId);
  const me = client?.getUserId();
  if (!client || !room || !me) throw new Error("no room/client");

  const plEvent = room.currentState.getStateEvents(EventType.RoomPowerLevels, "");
  const content = { ...((plEvent?.getContent() ?? {}) as PowerLevelContent) };
  const users = { ...(content.users ?? {}) };
  const usersDefault = content.users_default ?? 0;
  const stateDefault = content.state_default ?? 50;
  const myLevel = users[me] ?? usersDefault;
  const plGate = content.events?.[PL_TYPE] ?? stateDefault;
  return { client, roomId, me, content, users, usersDefault, myLevel, plGate };
}

// Throws if the viewer is not permitted to make this change (mirrors Rule 9 +
// the send-gate so we never fire a write the homeserver will reject).
function assertAllowed(
  ctx: ReturnType<typeof readContext>,
  targetUserId: string,
  newLevel: number,
) {
  if (ctx.myLevel < ctx.plGate) throw new Error("insufficient power to edit roles");
  if (newLevel > ctx.myLevel) throw new Error("cannot set a level above your own");
  if (targetUserId !== ctx.me) {
    const currentTarget = ctx.users[targetUserId] ?? ctx.usersDefault;
    if (currentTarget >= ctx.myLevel) throw new Error("cannot re-role a peer at or above you");
  }
}

type SendStateEvent = (
  r: string,
  t: string,
  c: Record<string, unknown>,
  k: string,
) => Promise<unknown>;

export interface SetPowerLevel {
  setLevel(targetUserId: string, newLevel: number): Promise<void>;
  resetToDefault(targetUserId: string): Promise<void>;
}

export function useSetPowerLevel(roomId: string): SetPowerLevel {
  const setLevel = useCallback(
    async (targetUserId: string, newLevel: number) => {
      const ctx = readContext(roomId);
      assertAllowed(ctx, targetUserId, newLevel);
      const users = { ...ctx.users, [targetUserId]: newLevel };
      await (ctx.client as unknown as { sendStateEvent: SendStateEvent }).sendStateEvent(
        roomId,
        PL_TYPE,
        { ...ctx.content, users },
        "",
      );
    },
    [roomId],
  );

  const resetToDefault = useCallback(
    async (targetUserId: string) => {
      const ctx = readContext(roomId);
      // Reset == set to users_default; guard against it too.
      assertAllowed(ctx, targetUserId, ctx.usersDefault);
      const users = { ...ctx.users };
      delete users[targetUserId];
      await (ctx.client as unknown as { sendStateEvent: SendStateEvent }).sendStateEvent(
        roomId,
        PL_TYPE,
        { ...ctx.content, users },
        "",
      );
    },
    [roomId],
  );

  return { setLevel, resetToDefault };
}
