interface UnreadBadgeProps {
  total: number;
  highlight: number;
  /** When true, render in compact rollup style (smaller, used in section headers). */
  compact?: boolean;
}

export function UnreadBadge({ total, highlight, compact }: UnreadBadgeProps) {
  if (total <= 0) return null;
  const display = total > 99 ? "99+" : String(total);
  const tone =
    highlight > 0
      ? "bg-destructive text-destructive-foreground"
      : "bg-muted text-muted-foreground";
  const size = compact ? "text-[10px] px-1.5 py-0 min-w-4" : "text-xs px-1.5 py-0.5 min-w-5";
  return (
    <span
      aria-label={`${total} unread`}
      className={`inline-flex items-center justify-center rounded-full font-medium tabular-nums ${tone} ${size}`}
    >
      {display}
    </span>
  );
}
