import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MatrixClientPeg } from "../../client/peg";

interface CreateRoomDialogProps {
  open: boolean;
  spaceId: string;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoomDialog({ open, spaceId, onOpenChange }: CreateRoomDialogProps) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [privacy, setPrivacy] = useState<"space" | "invite">("space");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const reset = () => {
    setName("");
    setTopic("");
    setPrivacy("space");
    setSubmitting(false);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const client = MatrixClientPeg.safeGet();
    if (!client) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const serverName = client.getUserId()?.split(":")[1] ?? "";
      const initialState: Record<string, unknown>[] = [
        {
          type: "m.space.parent",
          state_key: spaceId,
          content: { via: [serverName], canonical: true },
        },
      ];
      if (privacy === "space") {
        // Restricted-to-space: any member of this space can join. Without this,
        // the room would default to invite-only (private_chat).
        initialState.push({
          type: "m.room.join_rules",
          state_key: "",
          content: {
            join_rule: "restricted",
            allow: [{ type: "m.room_membership", room_id: spaceId }],
          },
        });
      }
      const created = (await (
        client as unknown as {
          createRoom: (opts: Record<string, unknown>) => Promise<{ room_id: string }>;
        }
      ).createRoom({
        name: trimmed,
        topic: topic.trim() || undefined,
        preset: "private_chat",
        initial_state: initialState,
      })) as { room_id: string };
      const newRoomId = created.room_id;
      await (
        client as unknown as {
          sendStateEvent: (
            roomId: string,
            type: string,
            content: Record<string, unknown>,
            stateKey: string,
          ) => Promise<unknown>;
        }
      ).sendStateEvent(spaceId, "m.space.child", { via: [serverName] }, newRoomId);
      onOpenChange(false);
      reset();
      navigate(`/room/${newRoomId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Create room</DialogTitle>
            <DialogDescription>
              Rooms are joinable by everyone in this space by default.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="room-name">Name</Label>
              <Input
                id="room-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="design"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="room-topic">Topic</Label>
              <Input
                id="room-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What is this channel about?"
              />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Who can join</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="privacy"
                  value="space"
                  checked={privacy === "space"}
                  onChange={() => setPrivacy("space")}
                />
                Space members — anyone in this space can join
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="privacy"
                  value="invite"
                  checked={privacy === "invite"}
                  onChange={() => setPrivacy("invite")}
                />
                Invite only — added manually
              </label>
            </fieldset>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || submitting}>
              Create room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
