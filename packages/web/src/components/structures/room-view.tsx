import { useParams } from "react-router-dom";
import { Composer } from "../rooms/composer";
import { TypingIndicator } from "../rooms/typing-indicator";
import { TimelinePanel } from "./timeline-panel";
import { useTyping } from "../../hooks/use-typing";

export function RoomView() {
  const { roomId } = useParams<{ roomId: string }>();
  const typingUserIds = useTyping(roomId ?? "");
  if (!roomId) return <div>No room selected</div>;
  return (
    <article className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <TimelinePanel roomId={roomId} />
      </div>
      <TypingIndicator typingUserIds={typingUserIds} />
      <Composer roomId={roomId} />
    </article>
  );
}
