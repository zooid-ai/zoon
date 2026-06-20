import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeFakeClient } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { setGlobalSearchEnabled } from "../../client/feature-flags";
import { SearchPage } from "./search-page";

const me = "@me:h.example";
const spaceId = "!space:h.example";

beforeEach(() => setGlobalSearchEnabled(false)); // isolate to This space tab only
afterEach(() => {
  MatrixClientPeg.reset();
  setGlobalSearchEnabled(true);
});

function setup() {
  const joinRoom = vi.fn(async () => ({ roomId: "!gen:h.example" }));
  const client = makeFakeClient({ userId: me });
  (client as unknown as { getRoom: () => unknown }).getRoom = () => null;
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

describe("<SearchPage> This space tab (was BrowseRooms)", () => {
  it("lists joinable rooms and joins on click", async () => {
    const { joinRoom } = setup();
    render(
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/search" element={<SearchPage spaceId={spaceId} />} />
          <Route path="/room/:roomId" element={<span />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("general")).toBeInTheDocument();
    const list = screen.getByRole("list");
    await userEvent.click(within(list).getByRole("button", { name: /join/i }));
    await waitFor(() => expect(joinRoom).toHaveBeenCalledWith("!gen:h.example"));
  });
});
