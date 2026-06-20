import type { Meta } from "@storybook/react-vite";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SidebarSearchBar } from "./sidebar-search-bar";

const meta = {
  title: "Structures/Sidebar/SidebarSearchBar",
} satisfies Meta;

export default meta;

export const Default = {
  render() {
    return (
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="*" element={<div className="w-56 border border-border"><SidebarSearchBar /></div>} />
        </Routes>
      </MemoryRouter>
    );
  },
};

export const OnSearchPage = {
  render() {
    return (
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="*" element={<div className="w-56 border border-border"><SidebarSearchBar /></div>} />
        </Routes>
      </MemoryRouter>
    );
  },
};
