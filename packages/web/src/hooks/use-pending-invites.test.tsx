import { act, renderHook } from "@testing-library/react";
import { ClientEvent, type MatrixClient, type Room, RoomEvent } from "matrix-js-sdk";
import { afterEach, describe, expect, it } from "vitest";
import { makeFakeClient, makeRoom } from "../../test/factories";
import { MatrixClientPeg } from "../client/peg";
import { usePendingInvites } from "./use-pending-invites";

const me = "@me:h.example";

afterEach(() => MatrixClientPeg.reset());

function makeInviteRoom(
  client: MatrixClient,
  roomId: string,
  opts: { name: string; inviter: string; ts: number },
): Room {
  const room = makeRoom(roomId, { client, myUserId: me });
  Object.assign(room as unknown as Record<string, unknown>, {
    getMyMembership: () => "invite",
    name: opts.name,
    getMember: (uid: string) =>
      uid === me
        ? { events: { member: { getSender: () => opts.inviter, getTs: () => opts.ts } } }
        : null,
  });
  return room;
}

function makeJoinedRoom(client: MatrixClient, roomId: string): Room {
  const room = makeRoom(roomId, { client, myUserId: me });
  Object.assign(room as unknown as Record<string, unknown>, {
    getMyMembership: () => "join",
    name: roomId,
  });
  return room;
}

describe("usePendingInvites", () => {
  it("returns only rooms where my membership is invite", () => {
    const client = makeFakeClient({ userId: me });
    const invite = makeInviteRoom(client, "!inv:h.example", {
      name: "Invited Room",
      inviter: "@alice:h.example",
      ts: 100,
    });
    const joined = makeJoinedRoom(client, "!joined:h.example");
    (client as unknown as { getRooms: () => Room[] }).getRooms = () => [invite, joined];
    MatrixClientPeg.injectClientForTest(client);

    const { result } = renderHook(() => usePendingInvites());
    expect(result.current).toHaveLength(1);
    expect(result.current[0].roomId).toBe("!inv:h.example");
    expect(result.current[0].name).toBe("Invited Room");
    expect(result.current[0].inviter).toBe("@alice:h.example");
  });

  it("sorts by invite timestamp descending (most recent first)", () => {
    const client = makeFakeClient({ userId: me });
    const older = makeInviteRoom(client, "!old:h.example", {
      name: "Old",
      inviter: "@a:h.example",
      ts: 100,
    });
    const newer = makeInviteRoom(client, "!new:h.example", {
      name: "New",
      inviter: "@b:h.example",
      ts: 999,
    });
    (client as unknown as { getRooms: () => Room[] }).getRooms = () => [older, newer];
    MatrixClientPeg.injectClientForTest(client);

    const { result } = renderHook(() => usePendingInvites());
    expect(result.current.map((i) => i.roomId)).toEqual(["!new:h.example", "!old:h.example"]);
  });

  it("re-evaluates when membership changes (invite accepted)", () => {
    const client = makeFakeClient({ userId: me });
    const invite = makeInviteRoom(client, "!inv:h.example", {
      name: "Invited",
      inviter: "@a:h.example",
      ts: 100,
    });
    let membership = "invite";
    Object.assign(invite as unknown as Record<string, unknown>, {
      getMyMembership: () => membership,
    });
    (client as unknown as { getRooms: () => Room[] }).getRooms = () => [invite];
    MatrixClientPeg.injectClientForTest(client);

    const { result } = renderHook(() => usePendingInvites());
    expect(result.current).toHaveLength(1);

    act(() => {
      membership = "join";
      client.emit(RoomEvent.MyMembership, invite, "join", "invite");
    });
    expect(result.current).toHaveLength(0);
  });

  it("re-evaluates when a new invite room arrives", () => {
    const client = makeFakeClient({ userId: me });
    const rooms: Room[] = [];
    (client as unknown as { getRooms: () => Room[] }).getRooms = () => rooms;
    MatrixClientPeg.injectClientForTest(client);

    const { result } = renderHook(() => usePendingInvites());
    expect(result.current).toHaveLength(0);

    act(() => {
      const invite = makeInviteRoom(client, "!inv:h.example", {
        name: "New invite",
        inviter: "@a:h.example",
        ts: 5,
      });
      rooms.push(invite);
      client.emit(ClientEvent.Room, invite);
    });
    expect(result.current).toHaveLength(1);
  });
});
