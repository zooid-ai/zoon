import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { makeFakeClient } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { TopicText } from "./topic-text";

const me = "@me:h.example";
afterEach(() => MatrixClientPeg.reset());

function mount(topic: string) {
  const client = makeFakeClient({ userId: me });
  const joinRoom = vi.fn().mockResolvedValue("!joined:h.example");
  (client as unknown as Record<string, unknown>).joinRoom = joinRoom;
  MatrixClientPeg.injectClientForTest(client);
  render(
    <MemoryRouter>
      <TopicText topic={topic} />
    </MemoryRouter>,
  );
  return { joinRoom };
}

it("renders plain text", () => {
  mount("ship the daemon");
  expect(screen.getByText("ship the daemon")).toBeInTheDocument();
});

it("renders an https url as an external link", () => {
  mount("docs https://zoon.eco here");
  const link = screen.getByRole("link", { name: "https://zoon.eco" });
  expect(link).toHaveAttribute("href", "https://zoon.eco");
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
});

it("renders a #channel as a button and joins-or-navigates on click, qualifying the alias with the server name", async () => {
  const { joinRoom } = mount("join #general now");
  const chan = screen.getByRole("button", { name: "#general" });
  await userEvent.click(chan);
  expect(joinRoom).toHaveBeenCalledWith("#general:h.example");
});

it("does not double-qualify a channel that already carries a server part", async () => {
  const { joinRoom } = mount("ping #help:other.example");
  await userEvent.click(screen.getByRole("button", { name: "#help:other.example" }));
  expect(joinRoom).toHaveBeenCalledWith("#help:other.example");
});

it("shows a 'show more' toggle when clamped and reveals full text on click", async () => {
  mount("line one line two line three line four line five");
  const toggle = screen.getByRole("button", { name: /show more/i });
  await userEvent.click(toggle);
  expect(screen.getByRole("button", { name: /show less/i })).toBeInTheDocument();
});
