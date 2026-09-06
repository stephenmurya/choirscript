export type SlashSearchableCommand = {
  id: string;
  label: string;
  keywords?: string[];
  aliases?: string[];
};

/** Rank slash commands deterministically from strongest to weakest match. */
export function rankSlashCommands<T extends SlashSearchableCommand>(commands: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return commands;

  const isSubsequence = (value: string) => {
    let index = 0;
    for (const character of value) {
      if (character === needle[index]) index += 1;
      if (index === needle.length) return true;
    }
    return false;
  };

  return commands
    .map((command, originalIndex) => {
      const fields = [command.label, ...(command.keywords ?? []), ...(command.aliases ?? [])]
        .map((field) => field.toLowerCase());
      const score = Math.min(...fields.map((field) => {
        if (field === needle) return 0;
        if (field.startsWith(needle)) return 1;
        if (field.split(/\s+/).some((word) => word.startsWith(needle))) return 2;
        if (field.includes(needle)) return 3;
        if (isSubsequence(field)) return 4;
        return 99;
      }));
      return { command, originalIndex, score };
    })
    .filter((item) => item.score < 99)
    .sort((a, b) => a.score - b.score || a.originalIndex - b.originalIndex)
    .map((item) => item.command);
}
