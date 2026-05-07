import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeMatrixEvent } from "../../../test/factories";
import { TextMessage } from "./text-message";

afterEach(() => cleanup());

describe("<TextMessage /> thread affordance", () => {
  it("shows a 'Reply in thread' control on hover/focus", async () => {
    const event = makeMatrixEvent({
      eventId: "$m1",
      roomId: "!r:h.example",
      sender: "@alice:h.example",
      type: "m.room.message",
      content: { msgtype: "m.text", body: "hi" },
    });
    render(<TextMessage event={event} onReplyInThread={vi.fn()} />);
    expect(screen.getByRole("button", { name: /reply in thread/i })).toBeDefined();
  });

  it("calls onReplyInThread with the event id when clicked", async () => {
    const onReplyInThread = vi.fn();
    const event = makeMatrixEvent({
      eventId: "$m1",
      roomId: "!r:h.example",
      sender: "@alice:h.example",
      type: "m.room.message",
      content: { msgtype: "m.text", body: "hi" },
    });
    render(<TextMessage event={event} onReplyInThread={onReplyInThread} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /reply in thread/i }));
    expect(onReplyInThread).toHaveBeenCalledWith("$m1");
  });

  it("shows a reply count + 'view thread' when the event is a thread root", async () => {
    const event = makeMatrixEvent({
      eventId: "$root",
      roomId: "!r:h.example",
      sender: "@alice:h.example",
      type: "m.room.message",
      content: { msgtype: "m.text", body: "root" },
      threadReplyCount: 3,
    });
    render(<TextMessage event={event} onViewThread={vi.fn()} />);
    expect(screen.getByText(/3 repl/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /view thread/i })).toBeDefined();
  });
});
