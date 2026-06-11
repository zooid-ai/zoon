import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MatrixClientPeg } from "@/client/peg";
import { makePushClient } from "@/lib/matrix/notification-prefs.test";
import { useRoomNotifState } from "./use-room-notif-state";

const roomId = "!r:h.example";

afterEach(() => MatrixClientPeg.reset());

describe("useRoomNotifState", () => {
  it("returns the current state and re-renders after a mutation", async () => {
    const client = makePushClient();
    MatrixClientPeg.injectClientForTest(client);
    const { result } = renderHook(() => useRoomNotifState(roomId));
    expect(result.current.state).toBe("all");

    await act(() => result.current.setState("mentions"));
    expect(client.getPushRules).toHaveBeenCalled();
  });
});
