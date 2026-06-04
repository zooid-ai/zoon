import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeFakeClient } from "../../../../test/factories";
import { MatrixClientPeg } from "../../../client/peg";
import { InviteRow } from "./invite-row";

const me = "@me:h.example";
afterEach(() => {
  MatrixClientPeg.reset();
  vi.restoreAllMocks();
});

const invite = { roomId: "!inv:h.example", name: "Design", inviter: "@alice:h.example", ts: 1 };

function setup() {
  const client = makeFakeClient({ userId: me });
  const joinRoom = vi.fn().mockResolvedValue(undefined);
  const leave = vi.fn().mockResolvedValue(undefined);
  Object.assign(client as unknown as Record<string, unknown>, { joinRoom, leave });
  MatrixClientPeg.injectClientForTest(client);
  return { joinRoom, leave };
}

describe("<InviteRow>", () => {
  it("shows the room name and inviter", () => {
    setup();
    render(<InviteRow invite={invite} />);
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText(/alice/)).toBeInTheDocument();
  });

  it("Accept calls joinRoom", async () => {
    const { joinRoom } = setup();
    const user = userEvent.setup();
    render(<InviteRow invite={invite} />);
    await user.click(screen.getByRole("button", { name: /accept/i }));
    expect(joinRoom).toHaveBeenCalledWith("!inv:h.example");
  });

  it("Decline calls leave", async () => {
    const { leave } = setup();
    const user = userEvent.setup();
    render(<InviteRow invite={invite} />);
    await user.click(screen.getByRole("button", { name: /decline/i }));
    expect(leave).toHaveBeenCalledWith("!inv:h.example");
  });

  it("falls back to roomId when name is empty", () => {
    setup();
    render(<InviteRow invite={{ ...invite, name: "" }} />);
    expect(screen.getByText("!inv:h.example")).toBeInTheDocument();
  });
});
