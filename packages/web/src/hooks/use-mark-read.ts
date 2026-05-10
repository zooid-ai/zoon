import { useEffect } from "react";
import { type Room, type MatrixEvent, RoomEvent } from "matrix-js-sdk";
import { MatrixClientPeg } from "../client/peg";

function lastLiveEvent(room: Room): MatrixEvent | null {
  const tl = room.getLiveTimeline();
  const events = tl.getEvents();
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]!;
    if (ev.getType() === "m.room.message") return ev;
  }
  return events[events.length - 1] ?? null;
}

export function useMarkRead(roomId: string): void {
  useEffect(() => {
    const client = MatrixClientPeg.safeGet();
    const room = client?.getRoom(roomId);
    if (!client || !room) return;

    let lastSent: string | null = null;
    const fire = () => {
      const ev = lastLiveEvent(room);
      if (!ev) return;
      const id = ev.getId() ?? null;
      if (id !== null && id === lastSent) return;
      lastSent = id;
      void client.sendReadReceipt(ev).catch(() => {
        // tolerated — a transient network failure shouldn't crash the room view
      });
    };

    fire();
    const onTimeline = () => fire();
    room.on(RoomEvent.Timeline, onTimeline);
    return () => {
      room.off(RoomEvent.Timeline, onTimeline);
    };
  }, [roomId]);
}
