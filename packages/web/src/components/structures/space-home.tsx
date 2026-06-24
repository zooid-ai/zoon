import { Compass, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreateDmDialog } from "@/components/dialogs/create-dm";
import { MatrixClientPeg } from "../../client/peg";
import { useRoomTopic } from "../../hooks/use-room-topic";
import { useSpaceName } from "../../hooks/use-space-name";
import { TopicText } from "../timeline/topic-text";
import { EmptyRoom } from "./empty-room";
import type { LoggedInOutletContext } from "./logged-in-view";

/** Route wrapper: resolves the active space from the logged-in Outlet context. */
export function SpaceHomeRoute() {
  const { spaceId } = useOutletContext<LoggedInOutletContext>();
  if (!spaceId) return <EmptyRoom />;
  return <SpaceHome spaceId={spaceId} />;
}

export function SpaceHome({ spaceId }: { spaceId: string }) {
  const navigate = useNavigate();
  const name = useSpaceName(spaceId) ?? MatrixClientPeg.safeGet()?.getRoom(spaceId)?.name ?? spaceId;
  const topic = useRoomTopic(spaceId);
  const [dmOpen, setDmOpen] = useState(false);

  return (
    <div className="flex h-full items-center justify-center p-6 sm:p-10">
      <div className="flex max-w-md flex-col items-center text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
        {topic && (
          <div className="mt-3 text-sm leading-6 text-muted-foreground">
            <TopicText topic={topic} clamp={false} />
          </div>
        )}
        <div className="mt-6 flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/search")}>
            <Compass className="mr-2 size-4" aria-hidden />
            Browse rooms
          </Button>
          <Button variant="outline" onClick={() => setDmOpen(true)}>
            <MessageSquare className="mr-2 size-4" aria-hidden />
            DMs
          </Button>
        </div>
      </div>
      <CreateDmDialog open={dmOpen} spaceId={spaceId} onOpenChange={setDmOpen} />
    </div>
  );
}
