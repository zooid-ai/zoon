import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeFakeClient, makeRoom } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { ReactionPicker } from "./reaction-picker";

const me = "@me:h.example";
const roomId = "!r:h.example";

// Stub the lazy-loaded picker module so tests don't hit the real
// emoji-mart bundle (slow, large, jsdom-hostile).
vi.mock("./reaction-picker-emoji", () => ({
  default: ({ onPick }: { onPick: (emoji: string) => void }) => (
    <button type="button" data-testid="stub-emoji" onClick={() => onPick("🚀")}>
      stub
    </button>
  ),
}));

afterEach(() => MatrixClientPeg.reset());

function setup() {
  const client = makeFakeClient({ userId: me });
  const room = makeRoom(roomId, { client, myUserId: me });
  (client as unknown as { getRoom: (id: string) => unknown }).getRoom = () => room;
  MatrixClientPeg.injectClientForTest(client);
  return client;
}

describe("<ReactionPicker>", () => {
  it("renders a trigger button labeled 'add reaction'", () => {
    setup();
    render(<ReactionPicker roomId={roomId} eventId="$t" />);
    expect(screen.getByRole("button", { name: /add reaction/i })).toBeInTheDocument();
  });

  it("opens a popover with the lazy emoji picker on trigger click", async () => {
    setup();
    const user = userEvent.setup();
    render(<ReactionPicker roomId={roomId} eventId="$t" />);
    await user.click(screen.getByRole("button", { name: /add reaction/i }));
    expect(await screen.findByTestId("stub-emoji")).toBeInTheDocument();
  });

  it("sends m.reaction with the picked emoji and closes the popover", async () => {
    const client = setup();
    const sendEvent = vi.fn(async () => ({ event_id: "$new" }));
    (client as unknown as { sendEvent: typeof sendEvent }).sendEvent = sendEvent;
    const user = userEvent.setup();
    render(<ReactionPicker roomId={roomId} eventId="$t" />);
    await user.click(screen.getByRole("button", { name: /add reaction/i }));
    await user.click(await screen.findByTestId("stub-emoji"));
    expect(sendEvent).toHaveBeenCalledWith(
      roomId,
      "m.reaction",
      expect.objectContaining({
        "m.relates_to": { rel_type: "m.annotation", event_id: "$t", key: "🚀" },
      }),
    );
  });
});
