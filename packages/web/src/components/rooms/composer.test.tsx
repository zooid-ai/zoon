import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeFakeClient, makeRoom } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { Composer } from "./composer";

const me = "@me:h.example";
const roomId = "!r:h.example";

function setup(send: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue({ event_id: "$m1" })) {
  const client = makeFakeClient({ userId: me });
  const room = makeRoom(roomId, { client, myUserId: me });
  (client as unknown as { getRoom: () => unknown }).getRoom = () => room;
  (client as unknown as { sendEvent: unknown }).sendEvent = send;
  MatrixClientPeg.injectClientForTest(client);
  return { client, send };
}

afterEach(() => {
  cleanup();
  MatrixClientPeg.reset();
});

describe("<Composer />", () => {
  it("sends m.room.message on Enter", async () => {
    const { send } = setup();
    render(<Composer roomId={roomId} />);
    const user = userEvent.setup();
    const input = screen.getByRole("textbox", { name: /message/i });
    await user.type(input, "hello world{Enter}");
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(roomId, "m.room.message", {
        msgtype: "m.text",
        body: "hello world",
      }),
    );
    expect(input).toHaveValue("");
  });

  it("Shift+Enter inserts a newline instead of sending", async () => {
    const { send } = setup();
    render(<Composer roomId={roomId} />);
    const user = userEvent.setup();
    const input = screen.getByRole("textbox", { name: /message/i });
    await user.type(input, "line1{Shift>}{Enter}{/Shift}line2");
    expect(send).not.toHaveBeenCalled();
    expect((input as HTMLTextAreaElement).value).toBe("line1\nline2");
  });

  it("ignores Enter when the input is empty", async () => {
    const { send } = setup();
    render(<Composer roomId={roomId} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: /message/i }), "{Enter}");
    expect(send).not.toHaveBeenCalled();
  });

  it("disables input + restores on send error", async () => {
    const send = vi.fn().mockRejectedValue(new Error("network"));
    setup(send);
    render(<Composer roomId={roomId} />);
    const user = userEvent.setup();
    const input = screen.getByRole("textbox", { name: /message/i });
    await user.type(input, "hi{Enter}");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/network/i));
    expect(input).not.toBeDisabled();
    expect(input).toHaveValue("hi");
  });

  // --- Mention autocomplete: activeIdx persistence ---
  describe("mention autocomplete activeIdx", () => {
    it("ArrowDown does not snap activeIdx back to 0", async () => {
      const client = makeFakeClient({ userId: me });
      const room = makeRoom(roomId, { client, myUserId: me });
      (room as unknown as { getJoinedMembers: () => unknown[] }).getJoinedMembers = () => [
        { userId: "@alice:h.example", name: "alice" },
        { userId: "@bob:h.example", name: "bob" },
      ];
      (client as unknown as { getRoom: () => unknown }).getRoom = () => room;
      (client as unknown as { sendEvent: unknown }).sendEvent = vi.fn().mockResolvedValue({ event_id: "$m1" });
      MatrixClientPeg.injectClientForTest(client);
      render(<Composer roomId={roomId} />);
      const user = userEvent.setup();
      const input = screen.getByRole("textbox", { name: /message/i });

      // Open mention autocomplete
      await user.type(input, "@");
      // Press ArrowDown once — should move to index 1
      await user.keyboard("{ArrowDown}");
      // Press ArrowDown again — should move to index 2 (wraps if only 2 entries → 0)
      await user.keyboard("{ArrowDown}");

      // The active item in the listbox should NOT be the first one
      const options = screen.getAllByRole("option");
      expect(options.length).toBeGreaterThan(0);

      // Move to index 1 and confirm Tab inserts the second member, not the first
      await user.keyboard("{ArrowDown}"); // index 0 → 1
      await user.keyboard("{Tab}");
      expect((input as HTMLTextAreaElement).value).toMatch(/@bob:h\.example/);
    });
  });

  // --- Slash command autocomplete ---
  describe("slash command autocomplete", () => {
    it("shows slash command suggestions when / is typed at start", async () => {
      setup();
      render(<Composer roomId={roomId} />);
      const user = userEvent.setup();
      const input = screen.getByRole("textbox", { name: /message/i });
      await user.type(input, "/");
      const list = screen.getByRole("listbox");
      expect(list).toBeDefined();
      // /clear should be visible
      expect(screen.getByText(/clear/i)).toBeDefined();
    });

    it("filters slash suggestions by query", async () => {
      setup();
      render(<Composer roomId={roomId} />);
      const user = userEvent.setup();
      const input = screen.getByRole("textbox", { name: /message/i });
      await user.type(input, "/cl");
      expect(screen.getAllByRole("option").some((o) => o.textContent?.includes("clear"))).toBe(true);
    });

    it("Tab selects a slash command and fills the textarea", async () => {
      setup();
      render(<Composer roomId={roomId} />);
      const user = userEvent.setup();
      const input = screen.getByRole("textbox", { name: /message/i });
      await user.type(input, "/");
      await user.keyboard("{Tab}");
      expect((input as HTMLTextAreaElement).value).toMatch(/^\//);
    });
  });
});
