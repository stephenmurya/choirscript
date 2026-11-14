import type {
  PartKey,
  PartSwap,
  PartSwapDirection,
  PartSwapMap,
  SongSection,
  SyllableToken,
  VocalPart,
} from "@/lib/songTypes";

/**
 * Part swapping for an arrangement placement.
 *
 * The choir stands in a ring: Soprano at the top, Tenor to the right, Bass at
 * the bottom, Alto to the left. A clockwise swap moves every part's notes one
 * position clockwise (S -> T -> B -> A -> S); anticlockwise moves them the
 * other way. A custom swap names, for each part, which part's notes it now
 * sings.
 *
 * Representation is target -> source: `map.tenor = "soprano"` means the people
 * singing the tenor line now read what the sopranos used to read.
 */

/** Clockwise ring order, starting at the top. */
export const SWAP_RING: VocalPart[] = ["soprano", "tenor", "bass", "alto"];

export const PART_LABEL: Record<VocalPart, string> = {
  soprano: "Soprano",
  alto: "Alto",
  tenor: "Tenor",
  bass: "Bass",
};

export const PART_LETTER: Record<VocalPart, string> = {
  soprano: "S",
  alto: "A",
  tenor: "T",
  bass: "B",
};

/**
 * The ring restricted to the parts the song actually uses, still in clockwise
 * order. A song with no bass sings a triangle, not a square: soprano -> tenor ->
 * alto -> soprano. Parts that are not in the song are never handed a line.
 */
export function ringFor(parts: readonly VocalPart[] | undefined): VocalPart[] {
  if (!parts || parts.length === 0) {
    return SWAP_RING;
  }

  const ring = SWAP_RING.filter((part) => parts.includes(part));
  return ring.length >= 2 ? ring : SWAP_RING;
}

function nextInRing(part: VocalPart, ring: VocalPart[], direction: PartSwapDirection): VocalPart {
  const index = ring.indexOf(part);
  if (index === -1) {
    return part;
  }
  const step = direction === "clockwise" ? 1 : -1;
  return ring[(index + step + ring.length) % ring.length];
}

/** Full target -> source mapping for a rotation over the given ring. */
export function directionMap(
  direction: PartSwapDirection,
  parts?: readonly VocalPart[],
): Record<VocalPart, VocalPart> {
  const ring = ringFor(parts);
  const map = { soprano: "soprano", alto: "alto", tenor: "tenor", bass: "bass" } as Record<
    VocalPart,
    VocalPart
  >;

  for (const source of ring) {
    map[nextInRing(source, ring, direction)] = source;
  }

  return map;
}

export function isIdentityMap(map: Record<VocalPart, VocalPart>): boolean {
  return SWAP_RING.every((part) => map[part] === part);
}

/**
 * Resolve a stored swap into a complete target -> source map, restricted to the
 * parts this song uses. Returns null when the placement swaps nothing.
 */
export function resolvePartSwap(
  swap: PartSwap | undefined,
  parts?: readonly VocalPart[],
): Record<VocalPart, VocalPart> | null {
  if (!swap) {
    return null;
  }

  const ring = ringFor(parts);
  const base: Record<VocalPart, VocalPart> = {
    soprano: "soprano",
    alto: "alto",
    tenor: "tenor",
    bass: "bass",
  };

  if (swap.map) {
    for (const part of ring) {
      const source = swap.map[part];
      if (source && ring.includes(source)) {
        base[part] = source;
      }
    }
  } else if (swap.direction) {
    Object.assign(base, directionMap(swap.direction, ring));
  } else {
    return null;
  }

  return isIdentityMap(base) ? null : base;
}

/** True when the swap maps two parts onto each other (S<->A, T<->B, etc.). */
export function isPairSwap(map: Record<VocalPart, VocalPart>): boolean {
  return SWAP_RING.filter((part) => map[part] !== part).every((part) => map[map[part] as VocalPart] === part);
}

/**
 * How the parts move, written the way a singer reads it: a closed chain that
 * starts at the soprano and names, for each part, whose line it now sings.
 *
 * Rehearsal renders `map[target] = source`, i.e. the Tenor lane shows the
 * soprano line. The chain must describe exactly that, so it is the walk
 * `S -> map[S] -> map[map[S]] ...` closed back onto the soprano:
 * SATB clockwise reads "S → A → B → T → S".
 */
export function describePartSwap(
  swap: PartSwap | undefined,
  parts?: readonly VocalPart[],
): string {
  const map = resolvePartSwap(swap, parts);
  if (!map) {
    return "";
  }

  const ring = ringFor(parts);
  const values = ring.map((part) => map[part] ?? part);
  const isPermutation = new Set(values).size === ring.length;

  if (isPermutation) {
    const start = ring.includes("soprano") ? "soprano" : ring[0];
    const chain: VocalPart[] = [start];
    let current = map[start] ?? start;

    while (current !== start && chain.length <= ring.length) {
      chain.push(current);
      current = map[current] ?? current;
    }

    chain.push(start);
    return chain.map((part) => PART_LETTER[part]).join(" → ");
  }

  // Not a permutation (custom maps can point two parts at one line): report the
  // movements as pairs rather than pretend there is a single cycle.
  return ring
    .filter((part) => (map[part] ?? part) !== part)
    .map((part) => `${PART_LETTER[part]}→${PART_LETTER[map[part] as VocalPart]}`)
    .join(" · ");
}

/** Validate a stored swap; returns undefined when it would not change anything. */
export function normalizePartSwap(swap: PartSwap | undefined): PartSwap | undefined {
  if (!swap) {
    return undefined;
  }

  const direction: PartSwapDirection | undefined =
    swap.direction === "clockwise" || swap.direction === "anticlockwise" ? swap.direction : undefined;

  let map: PartSwapMap | undefined;
  if (swap.map && typeof swap.map === "object") {
    const clean: PartSwapMap = {};
    for (const part of SWAP_RING) {
      const source = swap.map[part];
      if (source && SWAP_RING.includes(source) && source !== part) {
        clean[part] = source;
      }
    }
    map = Object.keys(clean).length > 0 ? clean : undefined;
  }

  if (map) {
    const resolved: Record<VocalPart, VocalPart> = { soprano: "soprano", alto: "alto", tenor: "tenor", bass: "bass" };
    Object.assign(resolved, map);
    return isIdentityMap(resolved) ? undefined : { map };
  }

  if (direction) {
    return { direction };
  }

  return undefined;
}

/**
 * Stable string for a swap, used to decide whether two placements render alike.
 * Structural on purpose: grouping does not know the song's enabled parts, and
 * two placements in one song always share them.
 */
export function partSwapKey(swap: PartSwap | undefined): string {
  if (!swap) {
    return "";
  }

  if (swap.map) {
    const entries = Object.entries(swap.map)
      .filter(([, value]) => Boolean(value))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([part, source]) => `${part}>${source}`);
    return entries.length > 0 ? `map:${entries.join(",")}` : "";
  }

  return swap.direction ? `dir:${swap.direction}` : "";
}

/** Rewrite one syllable's part values according to the map. */
export function applyPartSwapToSyllable(
  syllable: SyllableToken,
  map: Record<VocalPart, VocalPart>,
): SyllableToken {
  const value = (part: VocalPart) => syllable[part as PartKey];
  const next: SyllableToken = {
    ...syllable,
    soprano: value(map.soprano) ?? "",
    alto: value(map.alto) ?? "",
    tenor: value(map.tenor) ?? "",
  };

  const bass = value(map.bass);
  if (bass) {
    next.bass = bass;
  } else {
    delete next.bass;
  }

  return next;
}

/** Swap every syllable in a section; used by the rehearsal renderers. */
export function applyPartSwapToSection(
  section: SongSection,
  map: Record<VocalPart, VocalPart> | null,
): SongSection {
  if (!map) {
    return section;
  }

  return {
    ...section,
    lines: section.lines.map((line) => ({
      ...line,
      words: line.words.map((word) => ({
        ...word,
        syllables: word.syllables.map((syllable) => applyPartSwapToSyllable(syllable, map)),
      })),
    })),
  };
}
