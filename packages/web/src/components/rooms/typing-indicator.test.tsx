import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TypingIndicator } from "./typing-indicator";

afterEach(cleanup);

describe("<TypingIndicator />", () => {
  it("renders nothing when nobody is typing", () => {
    const { container } = render(<TypingIndicator typingUserIds={[]} />);
    expect(container.textContent).toBe("");
  });

  it("renders '<name> is typing…' for one user", () => {
    const { container } = render(<TypingIndicator typingUserIds={["@alice:h.example"]} />);
    expect(container.textContent).toMatch(/alice is typing/i);
  });

  it("renders '<name>, <name> are typing…' for two users", () => {
    const { container } = render(
      <TypingIndicator
        typingUserIds={["@alice:h.example", "@bob:h.example"]}
      />,
    );
    expect(container.textContent).toMatch(/alice/i);
    expect(container.textContent).toMatch(/bob/i);
    expect(container.textContent).toMatch(/are typing/i);
  });

  it("truncates to 2 names + N others for 4 users", () => {
    const { container } = render(
      <TypingIndicator
        typingUserIds={[
          "@alice:h.example",
          "@bob:h.example",
          "@carol:h.example",
          "@dave:h.example",
        ]}
      />,
    );
    expect(container.textContent).toMatch(/alice/i);
    expect(container.textContent).toMatch(/bob/i);
    expect(container.textContent).toMatch(/2 others/i);
    expect(container.textContent).toMatch(/typing/i);
  });
});
