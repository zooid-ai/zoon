import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { makeFakeClient, makeRoom } from "../../test/factories";
import { MatrixClientPeg } from "../client/peg";
import { usePendingRoomInvites } from "./use-pending-room-invites";

const me = "@me:h.example";
const roomId = "!r:h.example";
afterEach(() => MatrixClientPeg.reset());

describe("usePendingRoomInvites", () => {
  it("returns the room's invited members", () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom(roomId, { client, myUserId: me });
    Object.assign(room as unknown as Record<string, unknown>, {
      getMembersWithMembership: (m: string) =>
        m === "invite"
          ? [
              { userId: "@bob:h.example", name: "bob" },
              { userId: "@carol:h.example", name: "carol" },
            ]
          : [],
    });
    (client as unknown as { getRoom: () => unknown }).getRoom = () => room;
    MatrixClientPeg.injectClientForTest(client);

    const { result } = renderHook(() => usePendingRoomInvites(roomId));
    expect(result.current.map((m) => m.userId)).toEqual([
      "@bob:h.example",
      "@carol:h.example",
    ]);
  });

  it("returns empty when there are no pending invites", () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom(roomId, { client, myUserId: me });
    Object.assign(room as unknown as Record<string, unknown>, {
      getMembersWithMembership: () => [],
    });
    (client as unknown as { getRoom: () => unknown }).getRoom = () => room;
    MatrixClientPeg.injectClientForTest(client);

    const { result } = renderHook(() => usePendingRoomInvites(roomId));
    expect(result.current).toEqual([]);
  });
});
