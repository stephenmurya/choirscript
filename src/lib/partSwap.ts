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

function nextInRing(part: VocalPart, direction: PartSwapDirection): VocalPart {
  const index = SWAP_RING.indexOf(part);
  const step = direction === "clockwise" ? 1 : -1;
  return SWAP_RING[(index + step + SWAP_RING.length) % SWAP_RING.length];
}

/** Full target -> source mapping for a rotation. */
export function directionMap(direction: PartSwapDirection): Record<VocalPart, VocalPart> {
  const map = {} as Record<VocalPart, VocalPart>;
  for (const source of SWAP_RING) {
    map[nextInRing(source, direction)] = source;
  }
  return map;
}

export function isIdentityMap(map: Record<VocalPart, VocalPart>): boolean {
  return SWAP_RING.every((part) => map[part] === part);
}

/**
 * Resolve a stored swap into a complete target -> source map.
 * Returns null when the placement swaps nothing.
 */
export function resolvePartSwap(swap: PartSwap | undefined): Record<VocalPart, VocalPart> | null {
  if (!swap) {
    return null;
  }

  const base: Record<VocalPart, VocalPart> = {
    soprano: "soprano",
    alto: "alto",
    tenor: "tenor",
    bass: "bass",
  };

  if (swap.map) {
    for (const part of SWAP_RING) {
      const source = swap.map[part];
      if (source && SWAP_RING.includes(source)) {
        base[part] = source;
      }
    }
  } else if (swap.direction) {
    Object.assign(base, directionMap(swap.direction));
  } else {
    return null;
  }

  return isIdentityMap(base) ? null : base;
}

/** True when the swap maps two parts onto each other (S<->A, T<->B, etc.). */
export function isPairSwap(map: Record<VocalPart, VocalPart>): boolean {
  return SWAP_RING.filter((part) => map[part] !== part).every((part) => map[map[part] as VocalPart] === part);
}

export function describePartSwap(swap: PartSwap | undefined): string {
  const map = resolvePartSwap(swap);
  if (!map) {
    return "";
  }

  if (swap?.direction === "clockwise" && !swap.map) {
    return "Swap ↻";
  }

  if (swap?.direction === "anticlockwise" && !swap.map) {
    return "Swap ↺";
  }

  return "Swap custom";
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

/** Stable string for a swap, used to decide whether two placements render alike. */
export function partSwapKey(swap: PartSwap | undefined): string {
  const map = resolvePartSwap(swap);
  if (!map) {
    return "";
  }

  return SWAP_RING.map((part) => `${part}>${map[part]}`).join(",");
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
