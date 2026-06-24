export type TopicToken =
  | { kind: "text"; value: string }
  | { kind: "url"; value: string }
  | { kind: "channel"; value: string };

// A url (http/https) or a #channel reference. A channel is '#' followed by
// non-space chars; an optional ':server' part is captured so a full alias
// (#help:zoon.eco) is one token. Trailing punctuation is excluded by the
// non-greedy character class (no '.', ',', ')', etc. at the boundary — those
// fall back into the surrounding text token).
const TOKEN_RE = /(https?:\/\/[^\s]+)|(#[A-Za-z0-9_-]+(?::[A-Za-z0-9.-]+)?)/g;

export function tokenizeTopic(topic: string): TopicToken[] {
  if (!topic) return [];
  const tokens: TopicToken[] = [];
  let last = 0;
  for (const m of topic.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) tokens.push({ kind: "text", value: topic.slice(last, idx) });
    if (m[1]) tokens.push({ kind: "url", value: m[1] });
    else if (m[2]) tokens.push({ kind: "channel", value: m[2] });
    last = idx + m[0].length;
  }
  if (last < topic.length) tokens.push({ kind: "text", value: topic.slice(last) });
  return tokens;
}
