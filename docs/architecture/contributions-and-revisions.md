# Architecture — Contributions and Revisions

**Purpose:** the version-control-shaped contribution model: immutable revisions, isolated
proposals, musical diffs, and the review workflow. **Status: NOT STARTED.** Design only.

## Why not plain text diffs

A song is a tree of identified entities (sections → lines → words → syllables → notes, plus timing
events and annotations). Text diffing produces unusable output, and last-write-wins merging loses
whole sections. The unit of change must be the **entity**, addressed by stable id, with moves and
reorders represented as operations rather than as delete+insert.

## Revisions

```ts
type Revision = {
  id: string;
  arrangementId: string;
  parentRevisionId: string | null;
  authorId: string;
  createdAt: string;
  summary: string;                 // one-line human description
  snapshot: ArrangementSnapshot;   // immutable, complete
  operations: Operation[];         // derived, for diffs and merging
};
```

- **Immutable.** A revision is never edited; publishing points at a revision id.
- **Complete snapshots, not patches.** Storage is cheap relative to the debugging cost of a
  broken patch chain; patches are derived for display.
- **Linear for now.** `parentRevisionId` allows a DAG later; the initial implementation should
  reject non-linear history rather than pretend to merge.

## Operations

```ts
type Operation =
  | { op: "setNote"; syllableId: string; part: VocalPart; notes: NoteEvent[] }
  | { op: "setSyllables"; wordId: string; pieces: string[] }
  | { op: "setTimingEvent"; lineId: string; eventId: string; durationUnits: number }
  | { op: "addOccurrence"; index: number; occurrence: ArrangementOccurrence }
  | { op: "moveOccurrence"; occurrenceId: string; toIndex: number }
  | { op: "setOccurrenceField"; occurrenceId: string; field: "performer" | "voicing" | "repeatCount" | "note"; value: unknown }
  | { op: "setAnnotation"; annotation: TechniqueAnnotation }
  | { op: "addSection"; section: SourceSection } | { op: "removeSection"; sectionId: string };
```

Diffing two snapshots emits operations by id. Anything that cannot be expressed as an operation
(e.g. a wholesale section replacement) is expressed as remove + add, which is honest and visible
in review.

## Proposals

```ts
type Proposal = {
  id: string;
  arrangementId: string;
  baseRevisionId: string;       // what the proposer started from
  authorId: string;
  status: "open" | "changes_requested" | "accepted" | "rejected" | "stale";
  title: string; description: string;
  branchSnapshot: ArrangementSnapshot;   // editable by the proposer only
  createdAt: string; updatedAt: string;
};
```

Lifecycle:

```text
public arrangement
  → Propose edit (creates branch from baseRevision)
     → edit in the normal editor, scoped to the branch
        → submit (status: open, notification to owner)
           → owner reviews diff
              ├─ accept  → new revision (author = proposer, committer = owner), publish optionally
              ├─ request changes → status changes_requested, branch stays editable
              └─ reject → status rejected, branch archived read-only
```

### Conflicts

The base can move while a proposal is open. Rules:

1. On submit and again on accept, compute `baseRevision → currentRevision` operations.
2. If the two operation sets touch **disjoint entities**, rebase automatically.
3. If they overlap, mark the proposal `stale` and present field-level conflicts for the owner.
4. Never auto-resolve a conflict on a note or a syllable split; those are musical decisions.

`stale` is not a failure state — it is the honest way to say "the song moved under you".

## Review UI requirements

- A per-section, per-line view of what changed: notes added/removed, syllables split, timing
  durations changed, occurrences reordered.
- Side-by-side rehearsal rendering of base vs proposal (this is why the notation compiler must be
  pure and reusable by both).
- Accept/reject at the level of the whole proposal, and (later) per line.
- Attribution shown on the arrangement and on the public page.

## Permissions

| Action | Who |
| --- | --- |
| Create proposal | Any signed-in user for a public/unlisted arrangement |
| Edit proposal branch | Its author |
| Accept / reject | Arrangement owner (or delegated editor with `canReview`) |
| Publish accepted revision | Owner only |
| Delete proposal | Author (if open) or owner |

## Storage implications

Relational, not document: `arrangement_revisions` (snapshot as `jsonb` + metadata),
`proposals`, `proposal_operations`. Snapshots as `jsonb` keep the schema stable while the musical
model evolves; the operations table is what makes review and conflict detection queryable.

## Deliberately out of scope for v1

- Real-time collaborative editing (CRDTs). The proposal model delivers most of the value at a
  fraction of the complexity.
- Branching beyond one proposer branch per arrangement.
- Merging proposals into each other.
- Public forks that live independently in the library (allowed later, but they are copies, not
  branches).

## Dependencies

1. Identity and ownership (a proposal needs an author and an owner).
2. Immutable revisions in the schema.
3. The pure notation compiler, to render base vs proposal for review.
4. Notifications (email at minimum; see `infrastructure-target.md`).

## Risks

- **Musical conflicts are subtle.** Two people editing different syllables of the same line is
  fine; the same syllable differently is not, and "different" includes enharmonic spellings.
- **Snapshot size.** A large song snapshot may be several hundred KB; store compressed and never
  send the full snapshot to a review list.
- **Attribution disputes.** Decide early whether accepted contributions make the arrangement
  "co-authored" or merely credited; the marketplace later depends on this.
