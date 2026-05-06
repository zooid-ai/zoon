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
  build: (args: string) => ParsedSlashCommand;
}

const COMMANDS: SlashCommandSpec[] = [
  {
    names: ["clear", "new"],
    description: "Start a new session for all agents in this channel",
    build: () => ({ eventType: "eco.zoon.session_reset", content: {} }),
  },
];

export function parseSlashCommand(body: string): ParsedSlashCommand | null {
  if (!body.startsWith("/")) return null;
  const space = body.indexOf(" ");
  const name = (space === -1 ? body.slice(1) : body.slice(1, space)).toLowerCase();
  const args = space === -1 ? "" : body.slice(space + 1).trim();
  for (const spec of COMMANDS) {
    if (spec.names.includes(name)) return spec.build(args);
  }
  return null;
}

export function listSlashCommands(): SlashCommandMeta[] {
  return COMMANDS.flatMap((c) =>
    c.names.map((name) => ({ name, description: c.description })),
  );
}
