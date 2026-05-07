import { Loader2 } from "lucide-react";

export function LoadMoreButton({
  loading,
  hasMore,
  onClick,
}: {
  loading: boolean;
  hasMore: boolean;
  onClick: () => void;
}) {
  if (!hasMore && !loading) return null;
  return (
    <div className="flex justify-center py-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading || !hasMore}
        className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        {loading ? "Loading…" : "Load more"}
      </button>
    </div>
  );
}
