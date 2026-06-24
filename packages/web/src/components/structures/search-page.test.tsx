import { render, screen, act, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeFakeClient } from "../../../test/factories";
import { MatrixClientPeg } from "@/client/peg";
import { setGlobalSearchEnabled } from "@/client/feature-flags";
import { SearchPage } from "./search-page";

const me = "@me:h.example";

function inject(opts: {
  publicRooms?: ReturnType<typeof vi.fn>;
  hierarchy?: ReturnType<typeof vi.fn>;
}) {
  const client = makeFakeClient({ userId: me });
  const cast = client as unknown as Record<string, unknown>;
  cast.getRoom = () => null;
  cast.publicRooms =
    opts.publicRooms ?? vi.fn(async () => ({ chunk: [], next_batch: undefined }));
  cast.getRoomHierarchy = opts.hierarchy ?? vi.fn(async () => ({ rooms: [] }));
  cast.joinRoom = vi.fn(async (id: string) => ({ roomId: id }));
  MatrixClientPeg.injectClientForTest(client);
  return client;
}

function Probe() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}
function renderPage(spaceId: string | null) {
  return render(
    <MemoryRouter initialEntries={["/search"]}>
      <Routes>
        <Route path="/search" element={<SearchPage spaceId={spaceId} />} />
        <Route path="/room/:roomId" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => setGlobalSearchEnabled(true));
afterEach(() => {
  MatrixClientPeg.reset();
  setGlobalSearchEnabled(true);
});

describe("SearchPage", () => {
  it("flag ON + space: shows both tabs and defaults to All rooms", async () => {
    inject({
      publicRooms: vi.fn(async () => ({
        chunk: [
          { room_id: "!a:h", name: "Alpha", num_joined_members: 3 },
          { room_id: "!s:h", name: "Cosmos", num_joined_members: 1, room_type: "m.space" },
        ],
      })),
    });
    renderPage("!space:h");

    expect(screen.getByRole("tab", { name: "This space" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "All rooms" })).toBeInTheDocument();
    // default tab = All rooms → public results visible, incl. a Space badge
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    expect(screen.getByText("Cosmos")).toBeInTheDocument();
    expect(screen.getByText("Space")).toBeInTheDocument(); // badge
  });

  it("flag OFF: only the This space tab renders; no All rooms", () => {
    setGlobalSearchEnabled(false);
    inject({
      hierarchy: vi.fn(async () => ({
        rooms: [{ room_id: "!r:h", name: "InSpace", num_joined_members: 4 }],
      })),
    });
    renderPage("!space:h");

    expect(screen.getByRole("tab", { name: "This space" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "All rooms" })).toBeNull();
  });

  it("flag ON + no space: This space tab is hidden, All rooms is default", () => {
    inject({});
    renderPage(null);

    expect(screen.queryByRole("tab", { name: "This space" })).toBeNull();
    expect(screen.getByRole("tab", { name: "All rooms" })).toBeInTheDocument();
  });

  it("switching to This space lists joinable rooms from the hierarchy", async () => {
    inject({
      hierarchy: vi.fn(async () => ({
        rooms: [{ room_id: "!r:h", name: "InSpace", num_joined_members: 4 }],
      })),
    });
    renderPage("!space:h");

    fireEvent.click(screen.getByRole("tab", { name: "This space" }));
    await waitFor(() => expect(screen.getByText("InSpace")).toBeInTheDocument());
  });

  it("joining a public room navigates to it", async () => {
    inject({
      publicRooms: vi.fn(async () => ({
        chunk: [{ room_id: "!a:h", name: "Alpha", num_joined_members: 3 }],
      })),
    });
    renderPage("!space:h");

    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    // Scope to the list to avoid matching the JoinByAlias "Join" button.
    const list = screen.getByRole("list");
    await act(async () => fireEvent.click(within(list).getByRole("button", { name: "Join" })));
    expect(screen.getByTestId("path").textContent).toBe("/room/!a:h");
  });

  it("a public space row joins the space without navigating to a room timeline", async () => {
    const client = inject({
      publicRooms: vi.fn(async () => ({
        chunk: [{ room_id: "!s:h", name: "Cosmos", num_joined_members: 1, room_type: "m.space" }],
      })),
    });
    renderPage("!space:h");

    await waitFor(() => expect(screen.getByText("Cosmos")).toBeInTheDocument());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Join" })));

    expect((client as unknown as { joinRoom: ReturnType<typeof vi.fn> }).joinRoom).toHaveBeenCalledWith("!s:h");
    expect(screen.queryByTestId("path")).toBeNull(); // did NOT navigate to /room/*
  });
});
