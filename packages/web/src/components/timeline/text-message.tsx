import type { MatrixEvent } from "matrix-js-sdk";
import { displayNameOf, senderColor, splitMentions } from "@/lib/sender";
import { UserAvatar } from "@/components/user-avatar";
import { usePresence } from "@/hooks/use-presence";
import { useThreadPreview } from "@/hooks/use-timeline";

function AvatarWithPresence({ userId }: { userId: string }) {
  const { presence } = usePresence(userId);
  return <UserAvatar userId={userId} size="sm" presence={presence} />;
}

export interface TextMessageProps {
  event: MatrixEvent;
  onReplyInThread?: (eventId: string) => void;
  onViewThread?: (eventId: string) => void;
  /** When true, hide thread preview + "Reply in thread" button (used inside ThreadView). */
  disableThreadAffordances?: boolean;
}

function InlineReply({ event }: { event: MatrixEvent }) {
  const c = event.getContent() as { msgtype?: string; body?: string };
  if (c.msgtype !== "m.text" && c.msgtype !== "m.notice") return null;
  const sender = event.getSender() ?? "?";
  return (
    <div className="text-sm leading-5">
      <span className="font-semibold" style={{ color: senderColor(sender) }}>
        {displayNameOf(sender)}
      </span>
      <span className="text-foreground/80 ml-1.5">{c.body ?? ""}</span>
    </div>
  );
}

export function TextMessage({
  event,
  onReplyInThread,
  onViewThread,
  disableThreadAffordances,
}: TextMessageProps) {
  const c = event.getContent() as { msgtype?: string; body?: string };
  if (c.msgtype !== "m.text" && c.msgtype !== "m.notice") return null;
  const sender = event.getSender() ?? "?";
  const body = c.body ?? "";
  const eventId = event.getId() ?? "";
  const roomId = event.getRoomId() ?? "";

  // When disabled, pass an empty rootId so the hook short-circuits and returns no preview.
  const { events: threadEvents, totalCount } = useThreadPreview(
    roomId,
    disableThreadAffordances ? "" : eventId,
  );

  return (
    <div className="group flex gap-2 py-1.5 hover:bg-muted/30">
      <div className="mt-0.5 shrink-0">
        <AvatarWithPresence userId={sender} />
      </div>
      <div className="min-w-0 flex-1">
        <span
          className="font-semibold text-sm leading-6"
          style={{ color: senderColor(sender) }}
          title={sender}
        >
          {displayNameOf(sender)}
        </span>
        <p className="min-w-0 whitespace-pre-wrap break-words leading-6 text-foreground text-sm">
          {splitMentions(body).map((seg, i) =>
            seg.userId ? (
              <span
                key={i}
                className="rounded-sm bg-primary/15 px-1 font-medium"
                style={{ color: senderColor(seg.userId) }}
                title={seg.userId}
              >
                @{displayNameOf(seg.userId)}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>

        {!disableThreadAffordances && totalCount > 0 && (
          <div className="mt-2 pl-3 border-l-2 border-muted-foreground/25 space-y-1">
            {totalCount > 3 && (
              <button
                type="button"
                onClick={() => onViewThread?.(eventId)}
                className="text-xs text-primary hover:underline block"
              >
                View thread ({totalCount} events)
              </button>
            )}
            {threadEvents.map((reply) => (
              <InlineReply key={reply.getId()} event={reply} />
            ))}
          </div>
        )}

        {!disableThreadAffordances && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
            <button
              type="button"
              aria-label="Reply in thread"
              onClick={() => onReplyInThread?.(eventId)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reply in thread
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
