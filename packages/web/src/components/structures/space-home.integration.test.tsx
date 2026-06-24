import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import { injectStateEvent, makeFakeClient, makeRoom, mkMatrixEvent } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import type { LoggedInOutletContext } from "./logged-in-view";
import { SpaceHomeRoute } from "./space-home";

const me = "@me:h.example";
const spaceId = "!space:h.example";
afterEach(() => MatrixClientPeg.reset());

it("renders the space home at '/' with the space topic", () => {
  const client = makeFakeClient({ userId: me });
  const space = makeRoom(spaceId, { client, myUserId: me });
  Object.assign(space as unknown as Record<string, unknown>, { name: "Acme", isSpaceRoom: () => true });
  injectStateEvent(
    space,
    mkMatrixEvent({ roomId: spaceId, sender: "@a:h.example", type: "m.room.topic", stateKey: "", content: { topic: "orientation: join #general" } }),
  );
  Object.assign(client as unknown as Record<string, unknown>, { getRoom: () => space });
  MatrixClientPeg.injectClientForTest(client);

  const ctx: LoggedInOutletContext = { spaceId, activeScope: { kind: "space", spaceId }, setScope: () => {} };
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<Outlet context={ctx} />}>
          <Route index element={<SpaceHomeRoute />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  expect(screen.getByRole("heading", { name: "Acme" })).toBeInTheDocument();
  expect(screen.getByText(/orientation/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "#general" })).toBeInTheDocument();
});
