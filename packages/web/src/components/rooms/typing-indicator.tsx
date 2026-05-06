import { displayNameOf, senderColor } from "@/lib/sender";

interface Props {
  typingUserIds: string[];
}

export function TypingIndicator({ typingUserIds }: Props) {
  if (typingUserIds.length === 0) return <div className="h-5" aria-hidden />;

  const MAX_NAMES = 2;
  const named = typingUserIds.slice(0, MAX_NAMES);
  const overflow = typingUserIds.length - MAX_NAMES;

  const nameSpans = named.map((uid) => (
    <span key={uid} style={{ color: senderColor(uid) }}>
      {displayNameOf(uid)}
    </span>
  ));

  let suffix: string;
  if (overflow > 0) {
    suffix = ` and ${overflow} other${overflow > 1 ? "s" : ""} are typing…`;
  } else if (typingUserIds.length === 1) {
    suffix = " is typing…";
  } else {
    suffix = " are typing…";
  }

  const parts: React.ReactNode[] = [];
  nameSpans.forEach((s, i) => {
    if (i > 0) parts.push(<span key={`sep-${i}`}>, </span>);
    parts.push(s);
  });

  return (
    <div className="h-5 px-3 text-xs text-muted-foreground flex items-center gap-0.5">
      {parts}
      <span>{suffix}</span>
    </div>
  );
}
