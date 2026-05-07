export interface ParsedSlashCommand {
  eventType: string;
  content: Record<string, unknown>;
}

export interface SlashCommandMeta {
  name: string;
  description: string;
}

interface SlashCommandSpec {
  names: string[];
  description: string;
  threadScopedOnly?: boolean;
  build: (args: string) => ParsedSlashCommand;
}

const COMMANDS: SlashCommandSpec[] = [
  {
    names: ["clear", "new"],
    description: "Reset the agent's memory of this thread",
    threadScopedOnly: true,
    build: () => ({ eventType: "eco.zoon.session_reset", content: {} }),
  },
];

export function parseSlashCommand(
  body: string,
  ctx: { threadScoped: boolean } = { threadScoped: false },
): ParsedSlashCommand | null {
  if (!body.startsWith("/")) return null;
  const space = body.indexOf(" ");
  const name = (space === -1 ? body.slice(1) : body.slice(1, space)).toLowerCase();
  const args = space === -1 ? "" : body.slice(space + 1).trim();
  for (const spec of COMMANDS) {
    if (!spec.names.includes(name)) continue;
    if (spec.threadScopedOnly && !ctx.threadScoped) return null;
    return spec.build(args);
  }
  return null;
}

export function listSlashCommands(ctx: { threadScoped: boolean } = { threadScoped: false }): SlashCommandMeta[] {
  return COMMANDS.flatMap((c) => {
    if (c.threadScopedOnly && !ctx.threadScoped) return [];
    return c.names.map((name) => ({ name, description: c.description }));
  });
}
