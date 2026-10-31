# ADR-0007: One canonical line timing with per-part overrides

Status: Accepted
Recorded: 2026-10-31, derived from code at commit `a79c7b1`

## Context

The advanced editor places bar-level timing events (syllables, holds, rests, breaks) on a beat
grid. In practice a line sometimes needs a different rhythm for one voice: the alto sustains
while the soprano moves, or the bass enters late. The data model therefore needs a scope axis.

Timing is also content-coupled: `TimingEvent.syllableId` points at a specific syllable token, so
lyrics edits must be able to remap or drop events.

## Decision

Store timing per canonical line, with two scopes inside each line:

```ts
Song.timingByLine[lineId] = {
  lineId,
  bars: Bar[],
  sharedEvents: TimingEvent[],                        // scope: "shared"
  partOverrides: Partial<Record<VocalPart, TimingEvent[]>>  // scope: "soprano" | ...
}
```

`TimingEvent.scope` records which lane an event belongs to (`src/lib/songTypes.ts:30`, `:43`).
`getEventsForScope` resolves a lane: `shared` returns `sharedEvents`, a part returns its
override when present and falls back to the shared events otherwise
(`src/lib/timing.ts:426`).

Editor support:

- `TimingScopeSelector` lets the user choose `shared` or a part
  (`src/components/TimingScopeSelector.tsx`, used at `src/components/DocumentScriptEditor.tsx:282`).
- Creating an override copies the shared events into the part's lane
  (`createPartOverrideFromShared`, `src/lib/timing.ts:636`); resetting deletes the lane
  (`resetPartOverride`, `:654`).
- All timing edits are applied across every line at once when the override is created or reset
  (`src/components/SongEditor.tsx:244`-`:270`).

Timing is owned by Source lines, not by arrangement occurrences. Repeated sections reuse the
same timing, and occurrence-level timing overrides remain an unbuilt seam.

## Consequences

Positive:

- Most lines store timing once; overrides exist only where a part genuinely differs.
- Rendering can resolve any lane without knowing whether an override exists.
- Lyrics edits can reconcile timing by syllable id across both lanes
  (`reconcileLineTiming`, `src/lib/lineText.ts:110`).
- Meter changes rebar all lines and all lanes through one function
  (`rebarLineTiming`, `src/lib/timing.ts:282`; `applyTimingSettingsToSong`, `:690`).

Negative and accepted:

- Overrides are full copies of the event list, not deltas. Creating an override on a long song
  duplicates every event for that part on every line.
- Two scopes mean every timing mutation must state which lane it targets; a wrong scope silently
  edits the wrong lane.
- `hasTimingOverride(part)` is computed by scanning every line
  (`src/components/SongEditor.tsx:727`), which is O(lines) on each render.
- Per-occurrence timing differences (final chorus half-time) cannot be expressed.

## Alternatives rejected

- **Timing per occurrence.** Recreates duplication per placement, orphans events on lyric edits,
  and makes "how do we sing the chorus" an arrangement question (Phase 3A section E).
- **One flat event list with a part field and no shared lane.** Forces every line to carry one
  event set per part even when all parts sing the same rhythm.
- **Delta-based overrides.** More compact, but requires a merge algorithm for every mutation;
  not implemented, and the seam is left for a future phase.

## Evidence

- `src/lib/songTypes.ts:30`, `:43`-`:73`, `:187`
- `src/lib/timing.ts:426`-`:433`, `:636`-`:662`, `:664`-`:703`
- `src/components/SongEditor.tsx:244`-`:270`, `:727`-`:732`
- `src/components/AdvancedTimingRehearsalView.tsx:123`-`:128`, `:213`-`:249`
