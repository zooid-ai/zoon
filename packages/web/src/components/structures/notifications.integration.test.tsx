import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoomEvent, type MatrixEvent, type Room } from "matrix-js-sdk";
import { MatrixClientPeg } from "@/client/peg";
import { sessionStorage_ } from "@/client/storage";
import { makeFakeClient, makeMatrixEvent, makeRoom } from "../../../test/factories";
import { useNotifications } from "@/hooks/use-notifications";

const roomId = "!r:h.example";
const me = "@me:h.example";

class FakeNotification {
  static permission: NotificationPermission = "granted";
  static requestPermission = vi.fn(async () => "granted" as NotificationPermission);
  static instances: FakeNotification[] = [];
  onclick: (() => void) | null = null;
  close = vi.fn();
  constructor(
    public title: string,
    public options?: NotificationOptions,
  ) {
    FakeNotification.instances.push(this);
  }
}

function Probe() {
  useNotifications();
  const location = useLocation();
  return <div data-testid="pathname">{location.pathname}</div>;
}

beforeEach(() => {
  FakeNotification.instances = [];
  vi.stubGlobal("Notification", FakeNotification);
  vi.spyOn(document, "hasFocus").mockReturnValue(false);
  if (!window.focus) (window as unknown as { focus: () => void }).focus = () => {};
  sessionStorage_.set("notifications-prompted", "1");
});

afterEach(() => {
  MatrixClientPeg.reset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("notification click-to-focus", () => {
  it("navigates to the originating room when the notification is clicked", () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom(roomId, { client, myUserId: me });
    const cast = client as unknown as Record<string, unknown>;
    cast.getRoom = () => room;
    cast.getPushActionsForEvent = vi.fn(() => ({ notify: true, tweaks: {} }));
    cast.isInitialSyncComplete = () => true;
    MatrixClientPeg.injectClientForTest(client);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("pathname").textContent).toBe("/");

    act(() =>
      (client as unknown as { emit: (...args: unknown[]) => void }).emit(
        RoomEvent.Timeline,
        makeMatrixEvent({
          eventId: "$m1",
          roomId,
          sender: "@alice:h.example",
          type: "m.room.message",
          content: { msgtype: "m.text", body: "ping" },
        }) as MatrixEvent,
        room as Room,
        false,
        false,
        { liveEvent: true },
      ),
    );

    const notification = FakeNotification.instances[0];
    expect(notification).toBeDefined();
    act(() => notification.onclick?.());

    expect(screen.getByTestId("pathname").textContent).toBe(`/room/${roomId}`);
    expect(notification.close).toHaveBeenCalled();
  });
});
