import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConditionKind, PushRuleActionName } from "matrix-js-sdk";
import { MatrixClientPeg } from "@/client/peg";
import { makePushClient } from "@/lib/matrix/notification-prefs.test";
import { makeRoom } from "../../../test/factories";
import { RoomHeader } from "./room-header";

const roomId = "!r:h.example";
const me = "@me:h.example";

function setupClient() {
  const client = makePushClient();
  const room = makeRoom(roomId, { client, myUserId: me });
  (client as unknown as Record<string, unknown>).getRoom = () => room;
  (client as unknown as Record<string, unknown>).getUser = () => null;
  MatrixClientPeg.injectClientForTest(client);
  return client;
}

afterEach(() => {
  MatrixClientPeg.reset();
  vi.restoreAllMocks();
});

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={[`/room/${roomId}`]}>
      <Routes>
        <Route path="/room/:roomId" element={<RoomHeader />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("room header notifications submenu", () => {
  it("sets the room to mentions-only from the submenu", async () => {
    const client = setupClient();
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole("button", { name: /room actions/i }));
    const sub = await screen.findByText(/^notifications$/i);
    // Radix submenus open on keyboard navigation, not click, under happy-dom
    sub.focus();
    await user.keyboard("{ArrowRight}");
    const mentionsItem = await screen.findByText(/mentions & keywords/i);
    await user.click(mentionsItem);
    expect(client.setRoomMutePushRule).toHaveBeenCalledWith("global", roomId, true);
  });

  it("shows a muted indicator when the room is muted", () => {
    const client = setupClient();
    (client as unknown as Record<string, unknown>).pushRules = {
      global: {
        override: [
          {
            rule_id: roomId,
            default: false,
            enabled: true,
            conditions: [{ kind: ConditionKind.EventMatch, key: "room_id", pattern: roomId }],
            actions: [PushRuleActionName.DontNotify],
          },
        ],
        content: [],
        room: [],
        sender: [],
        underride: [],
      },
    };
    renderHeader();
    expect(screen.getByLabelText(/muted/i)).toBeInTheDocument();
  });
});
