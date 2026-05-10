import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../../app";
import { MatrixClientPeg } from "../../client/peg";
import {
  mswServer,
  relaxUnhandled,
  stubStartClient,
  stubSyncWithRooms,
} from "../../../test/setup";

const HS = "https://h.example";
const me = "@me:h.example";

describe("reactions integration", () => {
  beforeEach(() => {
    localStorage.setItem(
      "zoon:session",
      JSON.stringify({ homeserverUrl: HS, accessToken: "tok", userId: me, deviceId: "DEV1" }),
    );
    relaxUnhandled();
    stubStartClient(HS);
    mswServer.use(
      http.get(
        `${HS}/_matrix/client/v3/directory/room/${encodeURIComponent("#dev:h.example")}`,
        () => HttpResponse.json({ room_id: "!space:h.example" }),
      ),
      http.post(
        `${HS}/_matrix/client/v3/join/${encodeURIComponent("#dev:h.example")}`,
        () => HttpResponse.json({ room_id: "!space:h.example" }),
      ),
    );
  });
  afterEach(() => {
    MatrixClientPeg.reset();
    localStorage.clear();
  });

  it("clicking a pill sends m.reaction to the homeserver", async () => {
    stubSyncWithRooms(HS, [
      {
        roomId: "!space:h.example",
        myUserId: me,
        state: [
          {
            type: "m.space.child",
            sender: me,
            stateKey: "!a:h.example",
            content: { via: ["h.example"] },
          },
        ],
      },
      {
        roomId: "!a:h.example",
        myUserId: me,
        state: [{ type: "m.room.name", sender: me, stateKey: "", content: { name: "alpha" } }],
        timeline: [
          {
            type: "m.room.message",
            sender: "@bob:h.example",
            content: { msgtype: "m.text", body: "hello" },
            eventId: "$msg",
          },
          {
            type: "m.reaction",
            sender: "@bob:h.example",
            content: {
              "m.relates_to": { rel_type: "m.annotation", event_id: "$msg", key: "👍" },
            },
            eventId: "$reactBob",
          },
        ],
      },
    ]);

    const captured: { value: { type: string; body: unknown } | null } = { value: null };
    mswServer.use(
      http.put(
        `${HS}/_matrix/client/v3/rooms/:roomId/send/:eventType/:txnId`,
        async ({ params, request }) => {
          captured.value = {
            type: String(params.eventType),
            body: await request.json(),
          };
          return HttpResponse.json({ event_id: "$echo" });
        },
      ),
    );

    const user = userEvent.setup();
    render(<App config={{ homeserverUrl: HS }} />);
    await user.click(await screen.findByText("alpha"));
    const pill = await screen.findByRole("button", { name: /👍 1/ });
    await user.click(pill);
    await waitFor(() => expect(captured.value?.type).toBe("m.reaction"));
    expect(captured.value?.body).toMatchObject({
      "m.relates_to": { rel_type: "m.annotation", event_id: "$msg", key: "👍" },
    });
  });
});
