import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import { injectStateEvent, makeFakeClient, makeRoom, mkMatrixEvent } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { SpaceHome } from "./space-home";

const me = "@me:h.example";
const spaceId = "!space:h.example";
afterEach(() => MatrixClientPeg.reset());

function Probe() {
  const { pathname } = useLocation();
  return <div data-testid="path">{pathname}</div>;
}

function setup(topic?: string) {
  const client = makeFakeClient({ userId: me });
  const space = makeRoom(spaceId, { client, myUserId: me });
  Object.assign(space as unknown as Record<string, unknown>, { name: "Acme", isSpaceRoom: () => true });
  if (topic) {
    injectStateEvent(
      space,
      mkMatrixEvent({ roomId: spaceId, sender: "@a:h.example", type: "m.room.topic", stateKey: "", content: { topic } }),
    );
  }
  Object.assign(client as unknown as Record<string, unknown>, { getRoom: (id: string) => (id === spaceId ? space : null) });
  MatrixClientPeg.injectClientForTest(client);
}

function renderHome() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<SpaceHome spaceId={spaceId} />} />
        <Route path="/search" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}

it("renders the space name and topic", () => {
  setup("welcome to Acme — join #general");
  renderHome();
  expect(screen.getByRole("heading", { name: "Acme" })).toBeInTheDocument();
  expect(screen.getByText(/welcome to Acme/)).toBeInTheDocument();
});

it("autolinks #channel references in the topic", () => {
  setup("join #general for chat");
  renderHome();
  expect(screen.getByRole("button", { name: "#general" })).toBeInTheDocument();
});

it("Browse rooms CTA navigates to /search", async () => {
  setup("hi");
  renderHome();
  await userEvent.click(screen.getByRole("button", { name: /browse rooms/i }));
  expect(screen.getByTestId("path")).toHaveTextContent("/search");
});

it("DMs CTA opens the create-dm dialog", async () => {
  setup("hi");
  renderHome();
  await userEvent.click(screen.getByRole("button", { name: /^dms$/i }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
