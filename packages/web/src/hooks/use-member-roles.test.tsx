import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { makeFakeClient, makeRoom, mkMatrixEvent } from "../../test/factories";
import { MatrixClientPeg } from "../client/peg";
import { useMemberRoles } from "./use-member-roles";

const me = "@me:h.example";
const roomId = "!r:h.example";

function makeMembership(rid: string, userId: string) {
  return mkMatrixEvent({
    roomId: rid,
    sender: userId,
    type: "m.room.member",
    stateKey: userId,
    content: { membership: "join" },
  });
}

function setupRoom(powerLevels: Record<string, number>, usersDefault = 0) {
  const client = makeFakeClient({ userId: me });
  const room = makeRoom(roomId, { client, myUserId: me, powerLevels, usersDefault });
  room.currentState.setStateEvents(
    Object.keys(powerLevels).map((uid) => makeMembership(roomId, uid)),
  );
  (client as unknown as { getRoom: () => unknown }).getRoom = () => room;
  MatrixClientPeg.injectClientForTest(client);
  return { client, room };
}

afterEach(() => MatrixClientPeg.reset());

describe("useMemberRoles", () => {
  it("joins each member to its explicit power level and role", () => {
    setupRoom({ [me]: 100, "@mod:h.example": 50, "@bob:h.example": 0 });
    const { result } = renderHook(() => useMemberRoles(roomId));
    const byId = Object.fromEntries(result.current.map((m) => [m.userId, m]));
    expect(byId[me].powerLevel).toBe(100);
    expect(byId[me].role.kind).toBe("admin");
    expect(byId["@mod:h.example"].role.kind).toBe("moderator");
    expect(byId["@bob:h.example"].role.kind).toBe("default");
  });

  it("falls back to users_default for members absent from the users map", () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom(roomId, {
      client,
      myUserId: me,
      powerLevels: { [me]: 100 },
      usersDefault: 0,
    });
    room.currentState.setStateEvents([
      makeMembership(roomId, me),
      makeMembership(roomId, "@bob:h.example"),
    ]);
    (client as unknown as { getRoom: () => unknown }).getRoom = () => room;
    MatrixClientPeg.injectClientForTest(client);

    const { result } = renderHook(() => useMemberRoles(roomId));
    const bob = result.current.find((m) => m.userId === "@bob:h.example");
    expect(bob?.powerLevel).toBe(0);
    expect(bob?.role.kind).toBe("default");
  });

  it("preserves non-standard levels as custom roles", () => {
    setupRoom({ [me]: 100, "@odd:h.example": 25 });
    const { result } = renderHook(() => useMemberRoles(roomId));
    const odd = result.current.find((m) => m.userId === "@odd:h.example");
    expect(odd?.powerLevel).toBe(25);
    expect(odd?.role.kind).toBe("custom");
  });
});
