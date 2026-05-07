import type { MatrixEvent } from "matrix-js-sdk";
import { EventTile } from "../timeline/event-tile";

export function MessagePanel({
  events,
  onReplyInThread,
}: {
  events: MatrixEvent[];
  onReplyInThread?: (eventId: string) => void;
}) {
  return (
    <ol className="flex flex-col gap-0.5 px-4 py-3">
      {events.map((ev) => (
        <li key={ev.getId() ?? `${ev.getType()}-${ev.getTs()}`}>
          <EventTile event={ev} onReplyInThread={onReplyInThread} />
        </li>
      ))}
    </ol>
  );
}
