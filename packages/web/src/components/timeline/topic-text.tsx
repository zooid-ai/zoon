import { useState } from "react";
import { MatrixClientPeg } from "../../client/peg";
import { useJoinRoom } from "../../hooks/use-join-room";
import { tokenizeTopic } from "../../lib/autolink";

/** Qualify a bare '#channel' with the current server name; leave full aliases alone. */
function qualifyAlias(token: string): string {
  if (token.includes(":")) return token;
  const me = MatrixClientPeg.safeGet()?.getUserId() ?? "";
  const server = me.split(":")[1] ?? "";
  return server ? `${token}:${server}` : token;
}

export function TopicText({ topic, clamp = true }: { topic: string; clamp?: boolean }) {
  const { joinRoom } = useJoinRoom();
  const [expanded, setExpanded] = useState(false);
  const tokens = tokenizeTopic(topic);

  return (
    <div>
      <p className={clamp && !expanded ? "line-clamp-3 whitespace-pre-wrap" : "whitespace-pre-wrap"}>
        {tokens.map((t, i) => {
          if (t.kind === "url") {
            return (
              <a
                key={i}
                href={t.value}
                target="_blank"
                rel="noopener noreferrer ugc"
                className="text-primary underline"
              >
                {t.value}
              </a>
            );
          }
          if (t.kind === "channel") {
            return (
              <button
                key={i}
                type="button"
                onClick={() => void joinRoom(qualifyAlias(t.value))}
                className="text-primary underline"
              >
                {t.value}
              </button>
            );
          }
          return <span key={i}>{t.value}</span>;
        })}
      </p>
      {clamp && topic.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? "show less" : "show more ▾"}
        </button>
      )}
    </div>
  );
}
