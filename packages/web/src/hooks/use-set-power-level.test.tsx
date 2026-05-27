import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeFakeClient, makeRoom } from "../../test/factories";
import { MatrixClientPeg } from "../client/peg";
import { useSetPowerLevel } from "./use-set-power-level";

const me = "@me:h.example";
const roomId = "!r:h.example";

function setup(powerLevels: Record<string, number>) {
  const sendStateEvent = vi.fn(
    async (_r: string, _t: string, _c: Record<string, unknown>, _k: string) => ({
      event_id: "$ev",
    }),
  );
  const client = makeFakeClient({ userId: me });
  const room = makeRoom(roomId, { client, myUserId: me, powerLevels });
  (client as unknown as { getRoom: () => unknown }).getRoom = () => room;
  (client as unknown as { sendStateEvent: typeof sendStateEvent }).sendStateEvent =
    sendStateEvent;
  MatrixClientPeg.injectClientForTest(client);
  return { client, room, sendStateEvent };
}

afterEach(() => MatrixClientPeg.reset());

describe("useSetPowerLevel", () => {
  it("read-modify-writes the users map, preserving other keys", async () => {
    const { sendStateEvent } = setup({ [me]: 100, "@bob:h.example": 0 });
    const { result } = renderHook(() => useSetPowerLevel(roomId));
    await result.current.setLevel("@bob:h.example", 50);

    expect(sendStateEvent).toHaveBeenCalledTimes(1);
    const [calledRoom, type, content, stateKey] = sendStateEvent.mock.calls[0];
    expect(calledRoom).toBe(roomId);
    expect(type).toBe("m.room.power_levels");
    expect(stateKey).toBe("");
    expect((content as { users: Record<string, number> }).users).toEqual({
      [me]: 100,
      "@bob:h.example": 50,
    });
  });

  it("deletes the users entry when resetting to default", async () => {
    const { sendStateEvent } = setup({ [me]: 100, "@bob:h.example": 50 });
    const { result } = renderHook(() => useSetPowerLevel(roomId));
    await result.current.resetToDefault("@bob:h.example");

    const content = sendStateEvent.mock.calls[0][2] as { users: Record<string, number> };
    expect(content.users).toEqual({ [me]: 100 });
    expect("@bob:h.example" in content.users).toBe(false);
  });

  it("refuses to write when the viewer cannot send power_levels", async () => {
    // viewer at 0, state_default 50 → cannot send m.room.power_levels
    const { sendStateEvent } = setup({ [me]: 0 });
    const { result } = renderHook(() => useSetPowerLevel(roomId));
    await expect(result.current.setLevel("@bob:h.example", 50)).rejects.toThrow();
    expect(sendStateEvent).not.toHaveBeenCalled();
  });

  it("refuses to set a level above the viewer's own", async () => {
    // viewer at 50 cannot grant admin (100) — Rule 9
    const { sendStateEvent } = setup({ [me]: 50 });
    const { result } = renderHook(() => useSetPowerLevel(roomId));
    await expect(result.current.setLevel("@bob:h.example", 100)).rejects.toThrow();
    expect(sendStateEvent).not.toHaveBeenCalled();
  });

  it("refuses to re-role a peer at or above the viewer's level", async () => {
    // viewer at 50, target also 50 → cannot change a peer ≥ self
    const { sendStateEvent } = setup({ [me]: 50, "@peer:h.example": 50 });
    const { result } = renderHook(() => useSetPowerLevel(roomId));
    await expect(result.current.setLevel("@peer:h.example", 0)).rejects.toThrow();
    expect(sendStateEvent).not.toHaveBeenCalled();
  });

  it("allows self-demotion below the viewer's own level", async () => {
    const { sendStateEvent } = setup({ [me]: 100 });
    const { result } = renderHook(() => useSetPowerLevel(roomId));
    await result.current.setLevel(me, 50);
    expect(sendStateEvent).toHaveBeenCalledTimes(1);
  });
});
