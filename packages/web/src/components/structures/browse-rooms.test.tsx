import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeFakeClient } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { BrowseRooms } from "./browse-rooms";

const me = "@me:h.example";
const spaceId = "!space:h.example";
afterEach(() => MatrixClientPeg.reset());

function setup() {
  const joinRoom = vi.fn(async () => ({}));
  const client = makeFakeClient({ userId: me });
  (client as unknown as { getRoom: () => unknown }).getRoom = () => null; // none joined
  (client as unknown as { getRoomHierarchy: () => Promise<{ rooms: unknown[] }> }).getRoomHierarchy =
    vi.fn(async () => ({
      rooms: [
        { room_id: spaceId, room_type: "m.space" },
        { room_id: "!gen:h.example", name: "general", topic: "town square", num_joined_members: 4 },
      ],
    }));
  (client as unknown as { joinRoom: typeof joinRoom }).joinRoom = joinRoom;
  MatrixClientPeg.injectClientForTest(client);
  return { joinRoom };
}

describe("<BrowseRooms>", () => {
  it("lists joinable rooms and joins on click", async () => {
    const { joinRoom } = setup();
    render(
      <MemoryRouter>
        <BrowseRooms spaceId={spaceId} />
      </MemoryRouter>,
    );
    expect(await screen.findByText("general")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /join/i }));
    await waitFor(() => expect(joinRoom).toHaveBeenCalledWith("!gen:h.example"));
  });
});
