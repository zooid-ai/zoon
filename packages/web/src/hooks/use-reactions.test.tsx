import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { makeFakeClient, makeMatrixEvent, makeRoom, pushTimelineEvent } from "../../test/factories";
import { MatrixClientPeg } from "../client/peg";
import { useReactions } from "./use-reactions";

const me = "@me:h.example";
const roomId = "!r:h.example";
const targetId = "$target";

afterEach(() => MatrixClientPeg.reset());

function reaction(eventId: string, sender: string, key: string) {
  return makeMatrixEvent({
    eventId,
    roomId,
    sender,
    type: "m.reaction",
    content: { "m.relates_to": { rel_type: "m.annotation", event_id: targetId, key } },
  });
}

function setup() {
  const client = makeFakeClient({ userId: me });
  const room = makeRoom(roomId, { client, myUserId: me });
  (client as unknown as { getRoom: (id: string) => unknown }).getRoom = () => room;
  MatrixClientPeg.injectClientForTest(client);
  return { client, room };
}

describe("useReactions", () => {
  it("returns an empty map when the target event has no annotations", () => {
    setup();
    const { result } = renderHook(() => useReactions(roomId, targetId));
    expect(result.current.size).toBe(0);
  });

  it("groups reactions by emoji and tags self-reactions as mine", () => {
    const { room } = setup();
    pushTimelineEvent(room, reaction("$r1", "@bob:h.example", "👍"));
    pushTimelineEvent(room, reaction("$r2", me, "👍"));
    pushTimelineEvent(room, reaction("$r3", "@carol:h.example", "🎉"));

    const { result } = renderHook(() => useReactions(roomId, targetId));
    expect(result.current.size).toBe(2);
    expect(result.current.get("👍")).toEqual({
      count: 2,
      mine: true,
      myEventId: "$r2",
    });
    expect(result.current.get("🎉")).toEqual({
      count: 1,
      mine: false,
      myEventId: undefined,
    });
  });

  it("ignores reactions whose m.relates_to does not match the target event_id", () => {
    const { room } = setup();
    pushTimelineEvent(
      room,
      makeMatrixEvent({
        eventId: "$other",
        roomId,
        sender: me,
        type: "m.reaction",
        content: { "m.relates_to": { rel_type: "m.annotation", event_id: "$another", key: "❤️" } },
      }),
    );
    const { result } = renderHook(() => useReactions(roomId, targetId));
    expect(result.current.size).toBe(0);
  });

  it("decrements counts when a reaction is redacted", () => {
    const { room } = setup();
    const r1 = reaction("$r1", me, "👍");
    pushTimelineEvent(room, r1);
    const { result } = renderHook(() => useReactions(roomId, targetId));
    expect(result.current.get("👍")?.count).toBe(1);

    act(() => {
      // Mark the reaction event as redacted by stubbing isRedacted.
      (r1 as unknown as { isRedacted: () => boolean }).isRedacted = () => true;
      // Re-emit a Room.timeline event so the hook resnapshots.
      pushTimelineEvent(
        room,
        makeMatrixEvent({
          eventId: "$noise",
          roomId,
          sender: me,
          type: "m.room.message",
          content: { msgtype: "m.text", body: "x" },
        }),
      );
    });
    expect(result.current.has("👍")).toBe(false);
  });
});
