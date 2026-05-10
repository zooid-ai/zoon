import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NotificationCountType } from "matrix-js-sdk";
import { makeFakeClient, makeRoom } from "../../test/factories";
import { MatrixClientPeg } from "../client/peg";
import { useSectionUnread } from "./use-section-unread";

const me = "@me:h.example";
afterEach(() => MatrixClientPeg.reset());

function room(id: string, total: number, highlight: number) {
  const client = MatrixClientPeg.safeGet() ?? makeFakeClient({ userId: me });
  const r = makeRoom(id, { client, myUserId: me });
  (r as unknown as { getUnreadNotificationCount: (t: string) => number }).getUnreadNotificationCount =
    (t) => (t === NotificationCountType.Total ? total : highlight);
  return r;
}

describe("useSectionUnread", () => {
  it("sums total + highlight across all rooms", () => {
    const client = makeFakeClient({ userId: me });
    MatrixClientPeg.injectClientForTest(client);
    const a = room("!a:h", 2, 0);
    const b = room("!b:h", 3, 1);
    const c = room("!c:h", 0, 0);
    const { result } = renderHook(() => useSectionUnread([a, b, c]));
    expect(result.current).toEqual({ total: 5, highlight: 1 });
  });

  it("returns zero for an empty list", () => {
    MatrixClientPeg.injectClientForTest(makeFakeClient({ userId: me }));
    const { result } = renderHook(() => useSectionUnread([]));
    expect(result.current).toEqual({ total: 0, highlight: 0 });
  });
});
