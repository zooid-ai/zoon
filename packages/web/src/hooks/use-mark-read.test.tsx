import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeFakeClient, makeMatrixEvent, makeRoom, pushTimelineEvent } from "../../test/factories";
import { MatrixClientPeg } from "../client/peg";
import { useMarkRead } from "./use-mark-read";

const me = "@me:h.example";
const roomId = "!r:h.example";

afterEach(() => MatrixClientPeg.reset());

describe("useMarkRead", () => {
  it("calls sendReadReceipt for the latest live event on mount", async () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom(roomId, { client, myUserId: me });
    const ev = makeMatrixEvent({
      eventId: "$latest",
      roomId,
      sender: "@bob:h.example",
      type: "m.room.message",
      content: { msgtype: "m.text", body: "hi" },
    });
    pushTimelineEvent(room, ev);
    (client as unknown as { getRoom: (id: string) => unknown }).getRoom = () => room;
    const sendReadReceipt = vi.fn(async () => ({}));
    (client as unknown as { sendReadReceipt: typeof sendReadReceipt }).sendReadReceipt = sendReadReceipt;
    MatrixClientPeg.injectClientForTest(client);

    renderHook(() => useMarkRead(roomId));
    await new Promise((r) => setTimeout(r, 0));
    expect(sendReadReceipt).toHaveBeenCalledTimes(1);
    expect((sendReadReceipt.mock.calls as unknown[][])[0]![0]).toBe(ev);
  });

  it("does nothing when the room has no live events", async () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom(roomId, { client, myUserId: me });
    (client as unknown as { getRoom: (id: string) => unknown }).getRoom = () => room;
    const sendReadReceipt = vi.fn(async () => ({}));
    (client as unknown as { sendReadReceipt: typeof sendReadReceipt }).sendReadReceipt = sendReadReceipt;
    MatrixClientPeg.injectClientForTest(client);

    renderHook(() => useMarkRead(roomId));
    await new Promise((r) => setTimeout(r, 0));
    expect(sendReadReceipt).not.toHaveBeenCalled();
  });

  it("re-fires when a new event arrives in the room", async () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom(roomId, { client, myUserId: me });
    const first = makeMatrixEvent({
      eventId: "$first",
      roomId,
      sender: "@bob:h.example",
      type: "m.room.message",
      content: { msgtype: "m.text", body: "hi" },
    });
    pushTimelineEvent(room, first);
    (client as unknown as { getRoom: (id: string) => unknown }).getRoom = () => room;
    const sendReadReceipt = vi.fn(async () => ({}));
    (client as unknown as { sendReadReceipt: typeof sendReadReceipt }).sendReadReceipt = sendReadReceipt;
    MatrixClientPeg.injectClientForTest(client);

    renderHook(() => useMarkRead(roomId));
    await new Promise((r) => setTimeout(r, 0));
    expect(sendReadReceipt).toHaveBeenCalledTimes(1);

    const second = makeMatrixEvent({
      eventId: "$second",
      roomId,
      sender: "@bob:h.example",
      type: "m.room.message",
      content: { msgtype: "m.text", body: "hello again" },
    });
    pushTimelineEvent(room, second);
    await new Promise((r) => setTimeout(r, 0));
    expect(sendReadReceipt).toHaveBeenCalledTimes(2);
    expect((sendReadReceipt.mock.calls as unknown[][])[1]![0]).toBe(second);
  });
});
