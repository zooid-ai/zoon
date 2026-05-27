import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { injectStateEvent, makeFakeClient, makeRoom, mkMatrixEvent } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { MemberPanel } from "./member-panel";

const me = "@me:h.example";
const roomId = "!r:h.example";
afterEach(() => MatrixClientPeg.reset());

function setup(powerLevels: Record<string, number>) {
  const client = makeFakeClient({ userId: me });
  const room = makeRoom(roomId, { client, myUserId: me, powerLevels });
  injectStateEvent(
    room,
    mkMatrixEvent({
      roomId,
      sender: "@admin:h.example",
      type: "m.room.power_levels",
      stateKey: "",
      content: { users: powerLevels, invite: 50, state_default: 50, events_default: 0 },
    }),
  );
  const members = Object.keys(powerLevels).map((userId) => ({
    userId,
    name: userId,
    membership: "join",
  }));
  (room as unknown as { getJoinedMembers: () => unknown[] }).getJoinedMembers = () => members;
  (client as unknown as { getRoom: (id: string) => unknown }).getRoom = (id) =>
    id === roomId ? room : null;
  (client as unknown as { getUser: () => unknown }).getUser = () => null;
  MatrixClientPeg.injectClientForTest(client);
}

describe("<MemberPanel> invite affordance", () => {
  it("shows the Invite button to users with PL ≥ invite", () => {
    setup({ [me]: 50 });
    render(<MemberPanel roomId={roomId} spaceId="!space:h.example" />);
    expect(screen.getByRole("button", { name: /invite/i })).toBeInTheDocument();
  });

  it("hides Invite when PL < invite", () => {
    setup({ [me]: 0 });
    render(<MemberPanel roomId={roomId} spaceId="!space:h.example" />);
    expect(screen.queryByRole("button", { name: /invite/i })).not.toBeInTheDocument();
  });

  it("opens the invite dialog on click", async () => {
    setup({ [me]: 100 });
    const user = userEvent.setup();
    render(<MemberPanel roomId={roomId} spaceId="!space:h.example" />);
    await user.click(screen.getByRole("button", { name: /invite/i }));
    expect(await screen.findByRole("dialog", { name: /invite to room/i })).toBeInTheDocument();
  });
});

describe("<MemberPanel> role grouping", () => {
  it("renders a heading per occupied role group", () => {
    setup({ [me]: 100, "@bob:h.example": 0 });
    render(<MemberPanel roomId={roomId} spaceId="!space:h.example" />);
    expect(screen.getByText(/Admins/)).toBeInTheDocument();
    expect(screen.getByText(/Members/)).toBeInTheDocument();
    expect(screen.queryByText(/Moderators/)).toBeNull();
  });
});
