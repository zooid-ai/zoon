import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import { injectStateEvent, makeFakeClient, makeRoom, mkMatrixEvent } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { RoomBanner } from "./room-banner";

const me = "@me:h.example";
const roomId = "!r:h.example";
afterEach(() => MatrixClientPeg.reset());

function setup(opts: { topic?: string; canEdit?: boolean }) {
  const client = makeFakeClient({ userId: me });
  // canEdit is driven by power level: state_default is 50, so give "me" >= 50 to edit.
  const room = makeRoom(roomId, {
    client,
    myUserId: me,
    powerLevels: { [me]: opts.canEdit ? 50 : 0 },
  });
  Object.assign(room as unknown as Record<string, unknown>, { name: "general" });
  if (opts.topic) {
    injectStateEvent(
      room,
      mkMatrixEvent({ roomId, sender: "@a:h.example", type: "m.room.topic", stateKey: "", content: { topic: opts.topic } }),
    );
  }
  Object.assign(client as unknown as Record<string, unknown>, { getRoom: (id: string) => (id === roomId ? room : null) });
  MatrixClientPeg.injectClientForTest(client);
}

function renderBanner(props: Partial<Parameters<typeof RoomBanner>[0]> = {}) {
  render(
    <MemoryRouter>
      <RoomBanner roomId={roomId} {...props} />
    </MemoryRouter>,
  );
}

it("renders the room name as a #-prefixed heading", () => {
  setup({ topic: "ship the daemon" });
  renderBanner();
  expect(screen.getByRole("heading", { name: "#general" })).toBeInTheDocument();
});

it("renders the topic via TopicText", () => {
  setup({ topic: "ship the daemon" });
  renderBanner();
  expect(screen.getByText("ship the daemon")).toBeInTheDocument();
});

it("renders without a topic (heading only)", () => {
  setup({});
  renderBanner();
  expect(screen.getByRole("heading", { name: "#general" })).toBeInTheDocument();
});

it("shows the edit affordance only when the user may set the topic", () => {
  setup({ topic: "x", canEdit: true });
  renderBanner({ onEdit: () => {} });
  expect(screen.getByRole("button", { name: /edit topic/i })).toBeInTheDocument();
});

it("hides the edit affordance when the user lacks permission", () => {
  setup({ topic: "x", canEdit: false });
  renderBanner({ onEdit: () => {} });
  expect(screen.queryByRole("button", { name: /edit topic/i })).not.toBeInTheDocument();
});
