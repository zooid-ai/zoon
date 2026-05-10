import { MatrixClientPeg } from "../../client/peg";
import type { ReactionCount, ReactionMap } from "../../hooks/use-reactions";
import { ReactionPicker } from "./reaction-picker";

interface ReactionsRowProps {
  roomId: string;
  eventId: string;
  reactions: ReactionMap;
}

export function ReactionsRow({ roomId, eventId, reactions }: ReactionsRowProps) {
  const client = MatrixClientPeg.safeGet();
  if (reactions.size === 0) return null;

  const onClick = async (emoji: string, c: ReactionCount) => {
    if (!client) return;
    if (c.mine && c.myEventId) {
      await client.redactEvent(roomId, c.myEventId);
      return;
    }
    await (client as unknown as {
      sendEvent: (room: string, type: string, content: Record<string, unknown>) => Promise<unknown>;
    }).sendEvent(roomId, "m.reaction", {
      "m.relates_to": { rel_type: "m.annotation", event_id: eventId, key: emoji },
    });
  };

  return (
    <div data-testid="reactions-row" className="mt-1 flex flex-wrap items-center gap-1">
      {Array.from(reactions.entries()).map(([emoji, c]) => (
        <button
          key={emoji}
          type="button"
          aria-label={`${emoji} ${c.count}`}
          onClick={() => void onClick(emoji, c)}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
            c.mine
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-border bg-muted/40 text-foreground hover:bg-muted"
          }`}
        >
          <span>{emoji}</span>
          <span className="tabular-nums">{c.count}</span>
        </button>
      ))}
      <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-1.5 py-0.5 hover:bg-muted">
        <ReactionPicker roomId={roomId} eventId={eventId} />
      </span>
    </div>
  );
}
