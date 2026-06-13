import { ListChecks } from "lucide-react";
import type { PlanSnapshot } from "@/hooks/use-plan";

export function PlanBoard({ plan }: { plan: PlanSnapshot | null }) {
  if (!plan || plan.entries.length === 0) return null;
  const done = plan.entries.filter((e) => e.status === "completed").length;
  return (
    <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <ListChecks className="h-3.5 w-3.5" />
        Plan
        <span className="ml-auto tabular-nums">
          {done}/{plan.entries.length}
        </span>
      </div>
      <ul className="space-y-0.5 text-sm">
        {plan.entries.map((e, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={statusBullet(e.status)} aria-label={e.status} />
            <span
              className={
                e.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
              }
            >
              {e.content}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function statusBullet(status: string) {
  const base = "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ";
  switch (status) {
    case "completed":
      return base + "bg-emerald-500";
    case "in_progress":
      return base + "bg-amber-500 animate-pulse";
    case "failed":
    case "cancelled":
      return base + "bg-destructive";
    default:
      return base + "bg-muted-foreground/40";
  }
}
