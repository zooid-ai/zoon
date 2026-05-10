import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NotificationCountType, RoomEvent } from "matrix-js-sdk";
import { makeFakeClient, makeRoom } from "../../test/factories";
import { MatrixClientPeg } from "../client/peg";
import { useUnread } from "./use-unread";

const me = "@me:h.example";
const roomId = "!r:h.example";

afterEach(() => MatrixClientPeg.reset());

function withCounts(total: number, highlight: number) {
  const client = makeFakeClient({ userId: me });
  const room = makeRoom(roomId, { client, myUserId: me });
  (room as unknown as { getUnreadNotificationCount: (t: string) => number }).getUnreadNotificationCount =
    (t) => (t === NotificationCountType.Total ? total : highlight);
  (client as unknown as { getRoom: (id: string) => unknown }).getRoom = (id) =>
    id === roomId ? room : null;
  MatrixClientPeg.injectClientForTest(client);
  return { client, room };
}

describe("useUnread", () => {
  it("returns total + highlight from room.getUnreadNotificationCount()", () => {
    withCounts(3, 1);
    const { result } = renderHook(() => useUnread(roomId));
    expect(result.current).toEqual({ total: 3, highlight: 1 });
  });

  it("returns zero counts when the room is missing", () => {
    const client = makeFakeClient({ userId: me });
    (client as unknown as { getRoom: () => null }).getRoom = () => null;
    MatrixClientPeg.injectClientForTest(client);
    const { result } = renderHook(() => useUnread(roomId));
    expect(result.current).toEqual({ total: 0, highlight: 0 });
  });

  it("updates when the room emits Room.UnreadNotifications", () => {
    const { room } = withCounts(0, 0);
    const { result } = renderHook(() => useUnread(roomId));
    expect(result.current.total).toBe(0);

    act(() => {
      (room as unknown as { getUnreadNotificationCount: (t: string) => number }).getUnreadNotificationCount =
        (t) => (t === NotificationCountType.Total ? 5 : 2);
      room.emit(RoomEvent.UnreadNotifications, { total: 5, highlight: 2 } as never);
    });

    expect(result.current).toEqual({ total: 5, highlight: 2 });
  });
});
