import { useLocation, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

/** Launcher styled as a search input: focus/click → /search; disabled while on /search. */
export function SidebarSearchBar() {
  const navigate = useNavigate();
  const onSearchPage = useLocation().pathname === "/search";

  return (
    <div className="px-2 py-2">
      <Input
        readOnly
        disabled={onSearchPage}
        aria-label="search"
        placeholder="Search…"
        className="cursor-pointer"
        onClick={() => navigate("/search")}
        onFocus={() => navigate("/search")}
      />
    </div>
  );
}
