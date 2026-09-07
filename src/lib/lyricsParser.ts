export type ParsedLyricsSection = {
  heading?: string;
  lines: string[];
};

export type ParsedLyricsDocument = {
  sections: ParsedLyricsSection[];
};

export type SuspiciousLyricsLine = {
  text: string;
  reason: string;
};

const SECTION_NAMES = [
  "verse",
  "chorus",
  "refrain",
  "pre[- ]chorus",
  "bridge",
  "intro",
  "interlude",
  "instrumental",
  "outro",
  "tag",
  "hook",
  "vamp",
  "coda",
  "ending",
  "turnaround",
].join("|");

const SECTION_NUMBER =
  "(?:\\s+(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|i{1,3}|iv|v|vi{0,3}|ix|x))?";
const SECTION_PATTERN = new RegExp(`^(?:${SECTION_NAMES})${SECTION_NUMBER}$`, "i");

function unwrapHeading(value: string) {
  const trimmed = value.trim().replace(/:\s*$/, "").trim();
  const wrapped = trimmed.match(/^(?:\[(.*)\]|\((.*)\))$/);
  return (wrapped?.[1] ?? wrapped?.[2] ?? trimmed).trim();
}

/** Returns a heading only when the complete line is a known section label. */
export function detectLyricsSectionHeading(line: string): string | undefined {
  const candidate = unwrapHeading(line);
  return SECTION_PATTERN.test(candidate) ? candidate : undefined;
}

/**
 * Parse pasted/imported lyrics without coupling the parser to the clipboard
 * or React. Blank lines are ignored; they never create synthetic sections.
 */
export function parseLyricsInput(text: string): ParsedLyricsDocument {
  const sections: ParsedLyricsSection[] = [];
  let current: ParsedLyricsSection | undefined;

  const ensureCurrent = () => {
    if (!current) {
      current = { lines: [] };
      sections.push(current);
    }
    return current;
  };

  text.replace(/\r\n|\r/g, "\n").split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const heading = detectLyricsSectionHeading(line);
    if (heading) {
      current = { heading, lines: [] };
      sections.push(current);
      return;
    }

    ensureCurrent().lines.push(line);
  });

  return { sections: sections.filter((section) => section.lines.length > 0) };
}

const SUSPICIOUS_PATTERNS: Array<[RegExp, string]> = [
  [/you might also like/i, "Recommendation text"],
  [/more songs? from/i, "Recommendation text"],
  [/related lyrics?/i, "Website navigation"],
  [/recommended/i, "Recommendation text"],
  [/^(written|submitted|contributed|annotations?|lyrics by)\b/i, "Contributor or annotation text"],
  [/^(home|share|subscribe|sign in|log in|advertisement)\b/i, "Website navigation"],
];

/** Flag likely scraped website copy without removing or rewriting it. */
export function findSuspiciousLyricsLines(text: string): SuspiciousLyricsLine[] {
  return text
    .replace(/\r\n|\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const match = SUSPICIOUS_PATTERNS.find(([pattern]) => pattern.test(line));
      return match ? [{ text: line, reason: match[1] }] : [];
    });
}
