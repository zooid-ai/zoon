import { Globe, Lock, LogOut, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MatrixClientPeg } from "../../client/peg";
import { useJoinRule } from "../../hooks/use-join-rule";

const RULE_LABEL = {
  invite: { Icon: Lock, text: "Invite only" },
  restricted: { Icon: Users, text: "Space members" },
  public: { Icon: Globe, text: "Anyone can join" },
} as const;

export function RoomInfoDialog({
  open,
  roomId,
  onOpenChange,
}: {
  open: boolean;
  roomId: string;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const { rule, spaceName } = useJoinRule(roomId);
  const room = MatrixClientPeg.safeGet()?.getRoom(roomId);
  const { Icon, text } = RULE_LABEL[rule];
  // `topic` is a convenience accessor not on the Room type in this sdk version;
  // fall back to the m.room.topic state event.
  const topic =
    (room as unknown as { topic?: string })?.topic ??
    (room?.currentState.getStateEvents("m.room.topic", "")?.getContent() as { topic?: string })
      ?.topic ??
    null;

  const onLeave = async () => {
    await MatrixClientPeg.safeGet()?.leave(roomId);
    onOpenChange(false);
    navigate("/");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{room?.name ?? roomId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          {topic && <p className="text-muted-foreground">{topic}</p>}
          <div className="flex items-center gap-2">
            <Icon className="size-4" />
            <span>
              {text}
              {rule === "restricted" && spaceName ? ` · ${spaceName}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-4" />
            <span>{room?.getJoinedMemberCount() ?? 0} members</span>
          </div>
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <Button variant="destructive" size="sm" onClick={() => void onLeave()}>
            <LogOut className="mr-1 size-4" />
            Leave room
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
