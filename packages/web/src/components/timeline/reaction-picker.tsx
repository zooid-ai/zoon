import { lazy, Suspense, useState } from "react";
import { SmilePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MatrixClientPeg } from "../../client/peg";

const PickerEmoji = lazy(() => import("./reaction-picker-emoji"));

interface ReactionPickerProps {
  roomId: string;
  eventId: string;
}

export function ReactionPicker({ roomId, eventId }: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const client = MatrixClientPeg.safeGet();

  const send = async (emoji: string) => {
    setOpen(false);
    if (!client) return;
    await (client as unknown as {
      sendEvent: (room: string, type: string, content: Record<string, unknown>) => Promise<unknown>;
    }).sendEvent(roomId, "m.reaction", {
      "m.relates_to": { rel_type: "m.annotation", event_id: eventId, key: emoji },
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="add reaction"
          className="inline-flex items-center rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <SmilePlus className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Suspense fallback={<div className="p-3 text-xs">Loading…</div>}>
          {open && <PickerEmoji onPick={send} />}
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}
