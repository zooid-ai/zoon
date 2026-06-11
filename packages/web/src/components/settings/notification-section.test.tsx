import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConditionKind } from "matrix-js-sdk";
import { MatrixClientPeg } from "@/client/peg";
import { sessionStorage_ } from "@/client/storage";
import { makePushClient } from "@/lib/matrix/notification-prefs.test";
import { NotificationSection } from "./notification-section";

class FakeNotification {
  static permission: NotificationPermission = "granted";
  static requestPermission = vi.fn(async () => "granted" as NotificationPermission);
}

beforeEach(() => {
  FakeNotification.permission = "granted";
  FakeNotification.requestPermission.mockClear();
  vi.stubGlobal("Notification", FakeNotification);
  sessionStorage_.remove("notifications-enabled");
  MatrixClientPeg.injectClientForTest(makePushClient());
});

afterEach(() => {
  MatrixClientPeg.reset();
  vi.unstubAllGlobals();
});

describe("NotificationSection", () => {
  it("toggles the local browser switch and persists it", () => {
    render(<NotificationSection />);
    const toggle = screen.getByRole("button", { name: /this browser/i });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle);
    expect(sessionStorage_.get("notifications-enabled")).toBe("0");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("shows an Enable button while permission is default", () => {
    FakeNotification.permission = "default";
    render(<NotificationSection />);
    fireEvent.click(screen.getByRole("button", { name: /enable/i }));
    expect(FakeNotification.requestPermission).toHaveBeenCalled();
  });

  it("switches the global mode to mentions-only", () => {
    render(<NotificationSection />);
    const client = MatrixClientPeg.safeGet()!;
    fireEvent.click(screen.getByRole("button", { name: /mentions, dms & keywords/i }));
    expect(client.setPushRuleEnabled).toHaveBeenCalledWith(
      "global",
      "underride",
      ".m.rule.message",
      false,
    );
  });

  it("adds and removes keywords", () => {
    render(<NotificationSection />);
    const client = MatrixClientPeg.safeGet()!;
    fireEvent.change(screen.getByLabelText(/keyword/i), {
      target: { value: "deploy" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(client.addPushRule).toHaveBeenCalledWith(
      "global",
      "content",
      "deploy",
      expect.objectContaining({ pattern: "deploy" }),
    );
  });

  it("mutes a user by ID and lists existing mutes with an unmute action", () => {
    render(<NotificationSection />);
    const client = MatrixClientPeg.safeGet()!;
    fireEvent.change(screen.getByLabelText(/mute a user/i), {
      target: { value: "@agent:h.example" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^mute$/i }));
    expect(client.addPushRule).toHaveBeenCalledWith(
      "global",
      "override",
      "@agent:h.example",
      expect.objectContaining({
        conditions: [
          { kind: ConditionKind.EventMatch, key: "sender", pattern: "@agent:h.example" },
        ],
      }),
    );
  });
});
