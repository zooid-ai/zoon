import { describe, expect, it, vi } from "vitest";
import type { MatrixClient } from "matrix-js-sdk";
import { makeFakeClient, makeMatrixEvent, makeRoom } from "../../../test/factories";
import { evaluateNotification } from "./notifications";

const roomId = "!r:h.example";
const me = "@me:h.example";

function setup(opts: { notify?: boolean | null } = {}) {
  const client = makeFakeClient({ userId: me });
  const room = makeRoom(roomId, { client, myUserId: me });
  const cast = client as unknown as Record<string, unknown>;
  // null models "push rules not evaluable for this event"
  cast.getPushActionsForEvent = vi.fn(() =>
    opts.notify === null ? null : { notify: opts.notify ?? true, tweaks: {} },
  );
  return { client: client as MatrixClient, room };
}

function message(opts: { sender?: string; body?: string; type?: string } = {}) {
  return makeMatrixEvent({
    eventId: "$m1",
    roomId,
    sender: opts.sender ?? "@alice:h.example",
    type: opts.type ?? "m.room.message",
    content: { msgtype: "m.text", body: opts.body ?? "hi there" },
  });
}

describe("evaluateNotification", () => {
  it("returns a payload when push rules say notify", () => {
    const { client, room } = setup({ notify: true });
    const payload = evaluateNotification(client, room, message());
    expect(payload).toMatchObject({
      roomId,
      eventId: "$m1",
      title: room.name,
    });
    expect(payload?.body).toContain("hi there");
    expect(payload?.body).toMatch(/alice/i); // sender name prefix
  });

  it("returns null when push rules say do not notify (covers room mute + user mute)", () => {
    const { client, room } = setup({ notify: false });
    expect(evaluateNotification(client, room, message())).toBeNull();
  });

  it("returns null when push actions are unavailable", () => {
    const { client, room } = setup({ notify: null });
    expect(evaluateNotification(client, room, message())).toBeNull();
  });

  it("returns null for own messages even if rules would notify", () => {
    const { client, room } = setup({ notify: true });
    expect(evaluateNotification(client, room, message({ sender: me }))).toBeNull();
  });

  it("returns null for non-message events", () => {
    const { client, room } = setup({ notify: true });
    expect(evaluateNotification(client, room, message({ type: "m.reaction" }))).toBeNull();
  });

  it("truncates long bodies to 140 chars", () => {
    const { client, room } = setup({ notify: true });
    const payload = evaluateNotification(
      client,
      room,
      message({ body: "x".repeat(500) }),
    );
    expect(payload?.body.length).toBeLessThanOrEqual(140);
  });
});
