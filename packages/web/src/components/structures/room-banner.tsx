import { Pencil } from "lucide-react";
import { MatrixClientPeg } from "../../client/peg";
import { useMyPowerLevel } from "../../hooks/use-my-power-level";
import { useRoomTopic } from "../../hooks/use-room-topic";
import { TopicText } from "../timeline/topic-text";

export function RoomBanner({
  roomId,
  emptyRoom = false,
  onEdit,
}: {
  roomId: string;
  /** Empty-room variant: fill the timeline height and anchor to the bottom (Slack-style). */
  emptyRoom?: boolean;
  /** Surface an edit affordance (topic editor wiring is the caller's concern). */
  onEdit?: () => void;
}) {
  const room = MatrixClientPeg.safeGet()?.getRoom(roomId);
  const name = room?.name ?? roomId;
  const topic = useRoomTopic(roomId);
  const canEdit = useMyPowerLevel(roomId).canSendStateEvent("m.room.topic");

  // Left-aligned, like Slack's "beginning of #channel" intro. On an empty room
  // it fills the pane and sits at the bottom, just above the composer; on a
  // populated room it's the top tile and messages flow below it.
  return (
    <div
      className={
        emptyRoom
          ? "flex min-h-full flex-col justify-end gap-2 px-4 pb-3 pt-10"
          : "flex flex-col gap-2 px-4 pb-2 pt-8"
      }
    >
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">#{name}</h1>
        {canEdit && onEdit && (
          <button
            type="button"
            aria-label="Edit topic"
            onClick={onEdit}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {topic && (
        <div className="max-w-prose text-sm text-muted-foreground">
          <TopicText topic={topic} />
        </div>
      )}
    </div>
  );
}
