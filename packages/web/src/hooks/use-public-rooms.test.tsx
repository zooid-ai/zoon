import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeFakeClient } from "../../test/factories";
import { MatrixClientPeg } from "../client/peg";
import { usePublicRooms } from "./use-public-rooms";

const me = "@me:h.example";

afterEach(() => MatrixClientPeg.reset());

function setup(publicRooms: ReturnType<typeof vi.fn>, joinedIds: string[] = []) {
  const client = makeFakeClient({ userId: me });
  const cast = client as unknown as Record<string, unknown>;
  cast.publicRooms = publicRooms;
  cast.getRoom = (id: string) => (joinedIds.includes(id) ? { roomId: id } : null);
  MatrixClientPeg.injectClientForTest(client);
  return client;
}

describe("usePublicRooms", () => {
  it("maps chunk rows, flags spaces and already-joined rooms", async () => {
    const publicRooms = vi.fn(async () => ({
      chunk: [
        { room_id: "!a:h", name: "Alpha", topic: "t", num_joined_members: 5 },
        { room_id: "!s:h", name: "Space", num_joined_members: 2, room_type: "m.space" },
        { room_id: "!j:h", name: "Joined", num_joined_members: 9 },
      ],
      next_batch: undefined,
    }));
    setup(publicRooms, ["!j:h"]);

    const { result } = renderHook(() => usePublicRooms("alph"));

    await waitFor(() => expect(result.current.rooms.length).toBe(3));
    expect(publicRooms).toHaveBeenCalledWith(
      expect.objectContaining({ filter: { generic_search_term: "alph" } }),
    );
    expect(result.current.rooms[0]).toMatchObject({ roomId: "!a:h", isSpace: false, joined: false });
    expect(result.current.rooms[1]).toMatchObject({ roomId: "!s:h", isSpace: true });
    expect(result.current.rooms[2]).toMatchObject({ roomId: "!j:h", joined: true });
    expect(result.current.hasMore).toBe(false);
  });

  it("paginates: loadMore queries with the since token and appends", async () => {
    const publicRooms = vi
      .fn()
      .mockResolvedValueOnce({ chunk: [{ room_id: "!a:h", num_joined_members: 1 }], next_batch: "tok" })
      .mockResolvedValueOnce({ chunk: [{ room_id: "!b:h", num_joined_members: 1 }], next_batch: undefined });
    setup(publicRooms);

    const { result } = renderHook(() => usePublicRooms(""));
    await waitFor(() => expect(result.current.rooms).toHaveLength(1));
    expect(result.current.hasMore).toBe(true);

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.rooms).toHaveLength(2));

    expect(publicRooms).toHaveBeenLastCalledWith(expect.objectContaining({ since: "tok" }));
    expect(result.current.rooms.map((r) => r.roomId)).toEqual(["!a:h", "!b:h"]);
    expect(result.current.hasMore).toBe(false);
  });

  it("surfaces an error and does not throw", async () => {
    const publicRooms = vi.fn(async () => {
      throw new Error("nope");
    });
    setup(publicRooms);

    const { result } = renderHook(() => usePublicRooms("x"));
    await waitFor(() => expect(result.current.error).toBe("nope"));
    expect(result.current.rooms).toHaveLength(0);
  });
});
