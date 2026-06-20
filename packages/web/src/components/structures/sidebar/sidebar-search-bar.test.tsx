import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SidebarSearchBar } from "./sidebar-search-bar";

function Probe() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<><SidebarSearchBar /><Probe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SidebarSearchBar", () => {
  it("navigates to /search when clicked", () => {
    renderAt("/");
    fireEvent.click(screen.getByLabelText("search"));
    expect(screen.getByTestId("path").textContent).toBe("/search");
  });

  it("is disabled while already on the search page", () => {
    renderAt("/search");
    expect(screen.getByLabelText("search")).toBeDisabled();
  });
});
