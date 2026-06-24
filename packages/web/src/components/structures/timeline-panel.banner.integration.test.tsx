import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import {
  injectStateEvent,
  makeFakeClient,
  makeRoom,
  mkMatrixEvent,
  pushTimelineEvent,
} from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { TimelinePanel } from "./timeline-panel";

const me = "@me:h.example";
const roomId = "!r:h.example";
afterEach(() => MatrixClientPeg.reset());

function seed(opts: { messages: number }) {
  const client = makeFakeClient({ userId: me });
  const room = makeRoom(roomId, { client, myUserId: me });
  Object.assign(room as unknown as Record<string, unknown>, { name: "general" });
  injectStateEvent(
    room,
    mkMatrixEvent({ roomId, sender: "@a:h.example", type: "m.room.topic", stateKey: "", content: { topic: "ship the daemon" } }),
  );
  for (let i = 0; i < opts.messages; i++) {
    pushTimelineEvent(
      room,
      mkMatrixEvent({ roomId, sender: me, type: "m.room.message", content: { msgtype: "m.text", body: `m${i}` } }),
    );
  }
  Object.assign(client as unknown as Record<string, unknown>, { getRoom: (id: string) => (id === roomId ? room : null) });
  MatrixClientPeg.injectClientForTest(client);
  return room;
}

function renderTimeline() {
  render(
    <MemoryRouter>
      <TimelinePanel roomId={roomId} />
    </MemoryRouter>,
  );
}

it("shows the banner at the top of an empty room", async () => {
  seed({ messages: 0 });
  renderTimeline();
  await waitFor(() => expect(screen.getByRole("heading", { name: "#general" })).toBeInTheDocument());
});

it("keeps the banner above the messages when the room is at the start of history", async () => {
  seed({ messages: 3 });
  renderTimeline();
  await waitFor(() => expect(screen.getByRole("heading", { name: "#general" })).toBeInTheDocument());
  expect(screen.getByText("m0")).toBeInTheDocument();
});
