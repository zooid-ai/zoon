import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { injectStateEvent, makeFakeClient, makeRoom, mkMatrixEvent } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { RoomInfoDialog } from "./room-info";

const me = "@me:h.example";
const roomId = "!r:h.example";
afterEach(() => {
  MatrixClientPeg.reset();
  vi.restoreAllMocks();
});

function setup() {
  const client = makeFakeClient({ userId: me });
  const room = makeRoom(roomId, { client, myUserId: me });
  Object.assign(room as unknown as Record<string, unknown>, {
    name: "Design",
    topic: "where we design",
    getJoinedMemberCount: () => 4,
  });
  injectStateEvent(
    room,
    mkMatrixEvent({
      roomId,
      sender: "@admin:h.example",
      type: "m.room.join_rules",
      stateKey: "",
      content: { join_rule: "invite" },
    }),
  );
  const leave = vi.fn().mockResolvedValue(undefined);
  Object.assign(client as unknown as Record<string, unknown>, {
    leave,
    getRoom: (id: string) => (id === roomId ? room : null),
  });
  MatrixClientPeg.injectClientForTest(client);
  return { leave };
}

function renderDialog() {
  render(
    <MemoryRouter>
      <RoomInfoDialog open roomId={roomId} onOpenChange={() => {}} />
    </MemoryRouter>,
  );
}

describe("<RoomInfoDialog>", () => {
  it("shows name, topic, join rule and member count", () => {
    setup();
    renderDialog();
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("where we design")).toBeInTheDocument();
    expect(screen.getByText(/invite only/i)).toBeInTheDocument();
    expect(screen.getByText(/4 members/i)).toBeInTheDocument();
  });

  it("Leave room calls client.leave", async () => {
    const { leave } = setup();
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /leave room/i }));
    expect(leave).toHaveBeenCalledWith(roomId);
  });
});
