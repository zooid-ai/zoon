import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeFakeClient, makeRoom } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { ReactionsRow } from "./reactions-row";

const me = "@me:h.example";
const roomId = "!r:h.example";

afterEach(() => MatrixClientPeg.reset());

function setup() {
  const client = makeFakeClient({ userId: me });
  const room = makeRoom(roomId, { client, myUserId: me });
  (client as unknown as { getRoom: (id: string) => unknown }).getRoom = () => room;
  MatrixClientPeg.injectClientForTest(client);
  return client;
}

describe("<ReactionsRow>", () => {
  it("renders nothing when reactions is empty", () => {
    setup();
    const { container } = render(
      <ReactionsRow roomId={roomId} eventId="$t" reactions={new Map()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a pill per emoji with its count", () => {
    setup();
    render(
      <ReactionsRow
        roomId={roomId}
        eventId="$t"
        reactions={new Map([
          ["👍", { count: 3, mine: false, myEventId: undefined }],
          ["🎉", { count: 1, mine: true, myEventId: "$mine" }],
        ])}
      />,
    );
    expect(screen.getByRole("button", { name: /👍 3/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /🎉 1/ })).toBeInTheDocument();
  });

  it("clicking a pill the user already reacted to redacts their reaction", async () => {
    const client = setup();
    const redactEvent = vi.fn(async () => ({ event_id: "$redaction" }));
    (client as unknown as { redactEvent: typeof redactEvent }).redactEvent = redactEvent;
    const user = userEvent.setup();

    render(
      <ReactionsRow
        roomId={roomId}
        eventId="$t"
        reactions={new Map([
          ["👍", { count: 1, mine: true, myEventId: "$mine" }],
        ])}
      />,
    );
    await user.click(screen.getByRole("button", { name: /👍 1/ }));
    expect(redactEvent).toHaveBeenCalledWith(roomId, "$mine");
  });

  it("clicking a pill the user has not reacted to sends a new m.reaction", async () => {
    const client = setup();
    const sendEvent = vi.fn(async () => ({ event_id: "$new" }));
    (client as unknown as { sendEvent: typeof sendEvent }).sendEvent = sendEvent;
    const user = userEvent.setup();

    render(
      <ReactionsRow
        roomId={roomId}
        eventId="$t"
        reactions={new Map([
          ["👍", { count: 2, mine: false, myEventId: undefined }],
        ])}
      />,
    );
    await user.click(screen.getByRole("button", { name: /👍 2/ }));
    expect(sendEvent).toHaveBeenCalledWith(
      roomId,
      "m.reaction",
      expect.objectContaining({
        "m.relates_to": { rel_type: "m.annotation", event_id: "$t", key: "👍" },
      }),
    );
  });
});
