import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeFakeClient, makeRoom } from "../../test/factories";
import { MatrixClientPeg } from "../client/peg";
import { useJoinableRooms } from "./use-joinable-rooms";

const me = "@me:h.example";
const spaceId = "!space:h.example";
afterEach(() => MatrixClientPeg.reset());

function setup(hierarchyRooms: unknown[], joinedRoomIds: string[]) {
  const client = makeFakeClient({ userId: me });
  const joined = new Set(joinedRoomIds);
  (client as unknown as { getRoom: (id: string) => unknown }).getRoom = (id) =>
    joined.has(id) ? makeRoom(id, { client, myUserId: me }) : null;
  (client as unknown as { getRoomHierarchy: () => Promise<{ rooms: unknown[] }> }).getRoomHierarchy =
    vi.fn(async () => ({ rooms: hierarchyRooms }));
  MatrixClientPeg.injectClientForTest(client);
  return client;
}

describe("useJoinableRooms", () => {
  it("returns hierarchy rooms that the user has not joined, excluding the space itself", async () => {
    setup(
      [
        { room_id: spaceId, room_type: "m.space", name: "Dev" },
        { room_id: "!gen:h.example", name: "general", num_joined_members: 3, join_rule: "restricted" },
        { room_id: "!joined:h.example", name: "random", num_joined_members: 1 },
      ],
      ["!joined:h.example"],
    );
    const { result } = renderHook(() => useJoinableRooms(spaceId, true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rooms.map((r) => r.roomId)).toEqual(["!gen:h.example"]);
    expect(result.current.rooms[0].name).toBe("general");
  });

  it("does not fetch when not enabled", () => {
    const client = setup([], []);
    renderHook(() => useJoinableRooms(spaceId, false));
    expect(
      (client as unknown as { getRoomHierarchy: ReturnType<typeof vi.fn> }).getRoomHierarchy,
    ).not.toHaveBeenCalled();
  });
});
