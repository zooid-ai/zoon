import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeFakeClient } from "../../test/factories";
import { MatrixClientPeg } from "../client/peg";
import { useJoinRoom } from "./use-join-room";

const me = "@me:h.example";
afterEach(() => MatrixClientPeg.reset());

function Harness({ target }: { target: string }) {
  const { joinRoom, error, joining } = useJoinRoom();
  return (
    <>
      <button onClick={() => void joinRoom(target)}>join</button>
      <span data-testid="error">{error ?? ""}</span>
      <span data-testid="joining">{String(joining)}</span>
    </>
  );
}
function Probe() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}
function renderHarness(target: string) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Harness target={target} />} />
        <Route path="/room/:roomId" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("useJoinRoom", () => {
  it("joins and navigates to the room on success", async () => {
    const client = makeFakeClient({ userId: me });
    (client as unknown as Record<string, unknown>).joinRoom = vi.fn(async () => ({ roomId: "!r:h" }));
    MatrixClientPeg.injectClientForTest(client);

    renderHarness("#room:h");
    await act(async () => screen.getByText("join").click());

    expect(screen.getByTestId("path").textContent).toBe("/room/!r:h");
  });

  it("captures the error and does not navigate on failure", async () => {
    const client = makeFakeClient({ userId: me });
    (client as unknown as Record<string, unknown>).joinRoom = vi.fn(async () => {
      throw new Error("forbidden");
    });
    MatrixClientPeg.injectClientForTest(client);

    renderHarness("#bad:h");
    await act(async () => screen.getByText("join").click());

    expect(screen.queryByTestId("path")).toBeNull(); // still on "/"
    expect(screen.getByTestId("error").textContent).toBe("forbidden");
  });
});
