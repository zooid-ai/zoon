import type { MatrixEvent } from "matrix-js-sdk";
import { displayNameOf, senderColor, splitMentions } from "@/lib/sender";
import { UserAvatar } from "@/components/user-avatar";
import { usePresence } from "@/hooks/use-presence";

function AvatarWithPresence({ userId }: { userId: string }) {
  const { presence } = usePresence(userId);
  return <UserAvatar userId={userId} size="sm" presence={presence} />;
}

export interface TextMessageProps {
  event: MatrixEvent;
  onReplyInThread?: (eventId: string) => void;
  onViewThread?: (eventId: string) => void;
}

export function TextMessage({ event, onReplyInThread, onViewThread }: TextMessageProps) {
  const c = event.getContent() as { msgtype?: string; body?: string };
  if (c.msgtype !== "m.text" && c.msgtype !== "m.notice") return null;
  const sender = event.getSender() ?? "?";
  const body = c.body ?? "";
  const eventId = event.getId() ?? "";
  const thread = (event as unknown as { getThread?: () => { length: number } | null }).getThread?.();
  const replyCount = thread?.length ?? 0;

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
        {replyCount > 0 && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>
            <button
              type="button"
              aria-label="View thread"
              onClick={() => onViewThread?.(eventId)}
              className="text-xs text-primary hover:underline"
            >
              View thread
            </button>
          </div>
        )}
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
      </div>
    </div>
  );
}
