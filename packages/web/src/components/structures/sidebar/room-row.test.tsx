import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { NotificationCountType } from "matrix-js-sdk";
import { makeFakeClient, makeRoom } from "../../../../test/factories";
import { MatrixClientPeg } from "../../../client/peg";
import { RoomRow } from "./room-row";

const me = "@me:h.example";
afterEach(() => MatrixClientPeg.reset());

describe("<RoomRow>", () => {
  it("toggles the m.favourite tag via the kebab menu", async () => {
    const setTag = vi.fn(async () => undefined);
    const deleteTag = vi.fn(async () => undefined);
    const client = makeFakeClient({ userId: me });
    const room = makeRoom("!r:h.example", { client, myUserId: me });
    (room as unknown as { name: string }).name = "general";
    (client as unknown as { setRoomTag: typeof setTag }).setRoomTag = setTag;
    (client as unknown as { deleteRoomTag: typeof deleteTag }).deleteRoomTag = deleteTag;
    MatrixClientPeg.injectClientForTest(client);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoomRow room={room} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /room actions/i }));
    await user.click(await screen.findByRole("menuitem", { name: /add to favorites/i }));
    await waitFor(() => expect(setTag).toHaveBeenCalledWith("!r:h.example", "m.favourite", { order: 0.5 }));
  });
});

describe("<RoomRow> unread", () => {
  it("renders an unread badge with the total count when total > 0", () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom("!r:h.example", { client, myUserId: me });
    (room as unknown as { name: string }).name = "general";
    (room as unknown as { getUnreadNotificationCount: (t: string) => number }).getUnreadNotificationCount =
      (t) => (t === NotificationCountType.Total ? 4 : 0);
    (client as unknown as { getRoom: (id: string) => unknown }).getRoom = () => room;
    MatrixClientPeg.injectClientForTest(client);

    render(
      <MemoryRouter>
        <RoomRow room={room} />
      </MemoryRouter>,
    );

    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders the room name in bold when unread", () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom("!r:h.example", { client, myUserId: me });
    (room as unknown as { name: string }).name = "general";
    (room as unknown as { getUnreadNotificationCount: (t: string) => number }).getUnreadNotificationCount =
      (t) => (t === NotificationCountType.Total ? 1 : 0);
    (client as unknown as { getRoom: (id: string) => unknown }).getRoom = () => room;
    MatrixClientPeg.injectClientForTest(client);

    render(
      <MemoryRouter>
        <RoomRow room={room} />
      </MemoryRouter>,
    );

    const name = screen.getByText("general");
    expect(name.className).toMatch(/font-semibold|font-bold/);
  });

  it("does not render a badge when unread is 0", () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom("!r:h.example", { client, myUserId: me });
    (room as unknown as { name: string }).name = "general";
    (room as unknown as { getUnreadNotificationCount: () => number }).getUnreadNotificationCount = () => 0;
    (client as unknown as { getRoom: (id: string) => unknown }).getRoom = () => room;
    MatrixClientPeg.injectClientForTest(client);

    render(
      <MemoryRouter>
        <RoomRow room={room} />
      </MemoryRouter>,
    );

    expect(screen.queryByLabelText(/unread/i)).toBeNull();
  });
});
