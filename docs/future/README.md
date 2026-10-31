# Planned work

Everything on this page is **PLANNED or IN PROGRESS**. Nothing here is shipped in a commit or
available in production. Where uncommitted code exists, it is described explicitly as
working-tree state, not as delivered functionality.
Each item states what exists today (verified), what is intended, where the storage or API seam
would sit, and which questions must be answered before implementation. If an item ever ships,
it moves out of this file and into the architecture docs and the ledger.

Status vocabulary: `PLANNED` (design intention, no code), `IN PROGRESS` (code exists only as
uncommitted working-tree changes), `NOT STARTED` (no code at all).

---

## 1. Per-line and per-section part assignment

Status: PLANNED. No code.

### Today

Part enablement exists only at song level:

```ts
Song.enabledParts?: VocalPart[]
Song.voicePreset?: VoicePreset
Song.bassEnabled?: boolean
```

`src/lib/songTypes.ts:178`-`:181`. `SongLine` (`:106`) and `SourceSection` (`:133`) have no part
fields. Rendering filters lanes by the song-level set only
(`src/components/ColorfulRehearsalView.tsx:58`, `src/components/VoicePartLanes.tsx:27`), and the
rehearsal display panel only offers part switches for parts enabled on the song
(`src/components/RehearsalView.tsx:155`).

### Intended

A director can say "this verse is unison", "the bridge has no bass", or "only sopranos and altos
on this line", without creating a separate song or abusing empty cues.

Open design questions:

- **Inheritance.** Does a line-level list replace or intersect the song-level list? A line that
  enables a part the song disables is meaningless; intersection is the safer default. The
  section level then sits between song and line.
- **Empty cue vs disabled part.** Today a part with no entries is simply not shown by default
  (`songHasPartEntries`, `src/lib/songSelection.ts:75`). Assignment must be distinguishable from
  "no content yet", otherwise clearing a cue would silently disable the part.
- **Card summary.** `vocalParts` presence derives from any non-empty cue
  (`src/lib/songSummary.ts:45`); per-line assignment does not change that rule.
- **Rehearsal toggles.** `RehearsalView` currently computes initial toggles once after load
  (`src/components/RehearsalView.tsx:75`). Per-line assignment needs the renderer, not the
  toggle state, to be the authority, or the toggle set becomes a union across lines.

### Seam

Additive optional fields, defaulted to "inherit" by `normalizeSong` so existing songs need no
migration:

```ts
SourceSection.parts?: VocalPart[]   // absent = inherit from Song
SongLine.parts?: VocalPart[]        // absent = inherit from the section
```

Resolution helper next to `getEnabledVoiceParts` (`src/lib/songSelection.ts:67`), used by both
rehearsal renderers and the editor's voice lanes. Optional fields mean the aggregate stays
`schemaVersion: 2`; the share payload carries them automatically because it embeds the whole
song (`src/lib/songTypes.ts:203`).

---

## 2. Part transfer: move or swap a voice's notes between parts

Status: IN PROGRESS (uncommitted, not shipped, not verified end-to-end). An uncommitted
`src/lib/partTransfer.ts` and `src/components/PartTransferMenu.tsx` exist in the working tree as
of 2026-10-31. No commit contains them, the menu is not imported by any rendered component, and
no test exercises the helpers.

### Today

Shipped behaviour: each syllable stores one string per part (`soprano`, `alto`, `tenor`,
`bass?`, `src/lib/songTypes.ts:85`), edited cell by cell through `NotationInput`
(`src/components/VoicePartLanes.tsx:60`). Nothing in any commit moves or swaps a part's notes;
moving a line from tenor to alto means retyping every cell.

Uncommitted working-tree behaviour: `src/lib/partTransfer.ts` exports `transferLinePart`,
`transferSectionPart`, and `transferSongPart` for modes `"move"` and `"swap"`
(`PartTransferMode`, `:9`). A transfer rewrites only the part strings on each syllable;
`writePart` deletes `bass` when the new value is empty (`:23`-`:32`). The module's header states
explicitly that timing, annotations, and every other syllable field stay untouched (`:3`-`:7`).
`src/components/PartTransferMenu.tsx` renders a line/section/song scoped menu over the enabled
parts, but nothing imports it yet.

### Intended

A per-line or per-section operation that moves one part's notation into another part, either
`move` (source becomes empty) or `swap` (the two parts exchange values), with an explicit
conflict policy.

Open design questions:

- **Conflict policy.** The uncommitted helper currently overwrites the destination on `move` and
  exchanges the two values on `swap` (`transferSyllable`, `src/lib/partTransfer.ts:35`-`:57`). A
  move onto a non-empty destination therefore destroys the destination values with no
  confirmation. Any shipped UI must either block, confirm, or offer swap first.
- **Timing follows notes or not.** Timing lanes are keyed by part (`TimingEvent.scope`,
  `src/lib/songTypes.ts:50`; `LineTiming.partOverrides`, `:72`). If a tenor line's notes become
  alto notes, the tenor timing override arguably belongs to the notes, not the voice. Moving
  notes without moving their override would leave the new part singing the old shared rhythm.
  Whatever the answer, it must be recorded in a decision record (see `ADR-0007`).
- **Annotations.** `TechniqueAnnotation.appliesTo` is always `["all"]` today and is not enforced
  at render ([data-model.md](../architecture/data-model.md)). Part transfer is the first feature
  that would need real voice scoping.
- **Unit of operation.** Whole line only, or a selected syllable range? The editor already
  supports syllable-range selection (`LyricSelection`, `src/lib/songTypes.ts:208`), which makes
  range-scoped transfer plausible but harder to reason about with timing.
- **Undo.** Line deletion has a toast-level undo (`src/components/SongEditor.tsx:313`); a
  multi-cell transfer should reuse that pattern rather than invent a new one.

### Seam

The uncommitted pure module `src/lib/partTransfer.ts` is the right shape: no persistence change,
new `Song`/`SongLine`/`SourceSection` returned, inputs not mutated (`:3`-`:7`). What is still
missing before it can ship:

- a caller in `SongEditor`/`DocumentScriptEditor` and a menu mount per line/section,
- a decision on whether part timing lanes (`timingByLine[lineId].partOverrides`) follow the
  notes; today they do not,
- tests, including the empty-source and equal-values cases already handled internally
  (`:44`-`:54`).

---

## 3. Global syllable dictionary

Status: IN PROGRESS (uncommitted working tree, not shipped). The dictionary module, its writes,
and its UI controls exist only as uncommitted changes on 2026-10-31.

### Today

Shipped behaviour: syllable splitting uses the en-US hyphenation patterns plus a curated
exception list (`src/lib/syllableSplitter.ts`, committed version), and manual splits are stored
only inside the song as `WordToken.syllabification = "manual"` plus the syllable texts.

Uncommitted working-tree behaviour:

- `src/lib/syllableDictionary.ts`: `lookupSyllables`, `rememberSyllables`, `forgetSyllables`,
  an apply-scope preference (`get/setApplyEverywherePreference`) and a subscription
  (`subscribeApplyEverywherePreference`). Storage is `localStorage` keys
  `choirscript.syllableDictionary.v1` and `choirscript.syllableApplyScope.v1`.
- `splitWordIntoSyllables` consults the dictionary first (`src/lib/syllableSplitter.ts:108`).
- The word editor now writes it: `saveWordSyllables` calls `rememberSyllables`, then applies the
  split through `onUpdateWordSyllables(..., { everywhere })`; "Forget saved split" and
  "Restore automatic" call `forgetSyllables` (`src/components/LyricLineBlock.tsx`).
- The "apply to every occurrence" intent is a `Switch` in the same panel, backed by the
  persisted preference and implemented in `applyWordSyllables` (`src/lib/lineText.ts:157`).
- The editable split panel opens by double-clicking a syllable token or via a hover affordance
  on the last syllable of words with at least `MIN_SPLIT_AFFORDANCE_LETTERS = 3` letters
  (`src/lib/syllableSplitter.ts:13`, `showSplitAffordance` in `LyricLineBlock.tsx`).

What is still missing before it can be called delivered:

- No 3-dot menu on words; the affordance is a single direct control plus double-click.
- Storage is per browser. A split learned on one machine is absent on another, and signing out
  does not clear it.
- No tests cover the dictionary read/write/preference paths.

### Intended

1. **Ship the local dictionary.** Keep the current behaviour but treat it as a real feature:
   document it, clear it on sign-out if that is the desired privacy posture, and add tests.
2. **Make it per-workspace and shared.** Move storage behind the same function interface,
   backed by the future backend. Decide the merge rule: per-user overrides versus
   workspace-wide canonical splits. Keys are already normalized by `normalizeWordKey`
   (`src/lib/syllableDictionary.ts:63`), so they are portable.
3. **Seed from the curated exceptions.** The hand-written `EXCEPTIONS` map
   (`src/lib/syllableSplitter.ts:30`) is currently code. It could become default dictionary rows
   so directors can correct them.

### Seam

`src/lib/syllableDictionary.ts` is deliberately the only storage seam: callers use
lookup/remember/forget and never touch `localStorage` directly (module comment `:8`-`:12`).
Replacing the backing store must not change UI code. Two consequences worth stating before
implementation:

- Share snapshots are unaffected: a snapshot stores explicit syllable texts, not dictionary
  keys, so what a recipient sees does not depend on their dictionary.
- The dictionary affects only *future* splits (`splitWordIntoSyllables`), never existing tokens,
  unless a separate "re-apply dictionary" migration action is built.

## 4. Backend migration off Vercel and Firebase

Status: PLANNED. No abstraction layer exists.

### Today

Direct couplings, all inside `src/lib/firebase/` plus three call sites:

| Coupling | Files |
| --- | --- |
| Auth provider and session | `src/lib/firebase/client.ts`, `auth.ts`, `AuthContext.tsx` |
| User profile and workspace docs | `src/lib/firebase/workspace.ts`, `types.ts` |
| Song repository | `src/lib/firebase/songs.ts` |
| Legacy import | `src/lib/firebase/migration.ts` |
| Security model | `firestore.rules` (membership documents, owner-only writes) |
| Share snapshots | `src/lib/share-store.ts` (`@vercel/blob`) |
| Auth redirect helper rewrite | `next.config.ts` (`/__/auth/*` to `firebaseapp.com`) |
| Public config | six `NEXT_PUBLIC_FIREBASE_*` variables |

Components import these modules directly: `SongEditor` imports
`@/lib/firebase/songs` and `@/lib/firebase/AuthContext`
(`src/components/SongEditor.tsx:32`-`:34`), `WorkspaceSongsContext` imports the repository and
`AuthContext`, `RehearsalView` imports `getSong` and `useAuth`. There is no repository interface
and no provider indirection.

### Intended

Move hosting, auth, and storage without rewriting the domain layer. The domain layer is already
storage-agnostic: `Song`, `normalizeSong`, `resolveArrangement`, `timing.ts`, `annotationUtils`,
`lineText`, and `songSummary` do not import Firebase or Blob.

Non-negotiable constraints for any migration:

1. **Existing share URLs must keep working.** `/s/{shareId}` links are public artifacts that may
   be printed or sent to a choir. Either keep serving the existing Blob objects, or copy them to
   the new store under the same ids. `SharedSongPayload` with `schemaVersion: 2`
   (`src/lib/songTypes.ts:194`) is the interchange format; old `schemaVersion: 1` payloads must
   still be accepted and normalized (`src/lib/share-store.ts:104`).
2. **`normalizeSong` stays the boundary.** A new backend must not introduce a second sanitizer.
3. **The card summary derivation stays repository-side.** `buildSongCardSummary` is pure and can
   run on any host, but the metadata/body split (`ADR-0003`) is the reason dashboard reads are
   cheap; a new backend must preserve an equivalent listing projection.
4. **Authorization must remain server-enforced.** Today Firestore rules are the only boundary.
   A new backend must not replace them with client-side checks.
5. **Migration order matters.** Songs must be readable both ways during cutover; the localStorage
   import (`src/lib/firebase/migration.ts`) can be retired only after every user has signed in
   once against the new backend, because it is the only path that converts pre-cloud data.

### Seam

Three interfaces, extracted from the current modules before any provider is swapped:

- `SongRepository`: `list`, `getWithMeta`, `get`, `create`, `save`, `duplicate`, `delete`,
  `backfillSummary`.
- `AuthProviderAdapter`: subscribe to status/user, sign in/out, expose `workspaceId` and
  workspace identity.
- `ShareStore`: `put(payload)`, `get(shareId)`, plus id validation.

The domain modules need no changes; the components would import the interfaces rather than
`@/lib/firebase/*`. This refactor is itself unimplemented.

---

## 5. Smaller planned items justified by existing code

| Item | Status | Evidence for the intent | Missing piece |
| --- | --- | --- | --- |
| Multiple arrangements UI (switcher, rename, create) | PLANNED | Schema already stores `arrangements[]` and `activeArrangementId`; `ArrangementEditor` edits only the active one (`src/lib/arrangement.ts:34`) | No UI to create/select arrangements; `hasMeaningfulArrangement` exists but nothing surfaces it |
| Occurrence-level performance overrides (timing deltas, per-placement notes beyond free text) | PLANNED | Reserved seam documented in `src/lib/songTypes.ts:144`-`:149` and Phase 3A section E | No fields, no renderer support; today only `note` and `repeatCount` |
| Automated tests and CI | PLANNED | `scripts/phase3-validation.ts` and `scripts/phase3d-validation.ts` are manual assertion scripts | No runner, no npm script, no CI config |
| Server-side PDF rendering | PLANNED | Explicit "can be added later" comment in `src/components/PrintToolbar.tsx:18` | No PDF library, no service |
| Real-time collaboration | PLANNED | `SongCardSummary.contributors` and its comment ("Collaboration-ready without any collaboration logic existing yet", `src/lib/firebase/types.ts:25`-`:33`) | No presence, no listeners, no granular writes, no conflict resolution |
| Member management, invitations, roles beyond owner | PLANNED | `WorkspaceRole` includes `admin`/`editor`/`viewer` and rules already read the stored role (`firestore.rules:38`) | No UI, no write path, no invite flow |

---

## What this page is not

- It is not a roadmap with dates. No item here has a schedule.
- It is not a commitment that the described shape is final. The open questions are listed
  precisely because they are unresolved.
- It does not describe anything currently reachable in the app. If a future item ships, its
  description belongs in `architecture/` and its delivery belongs in
  `ledger/implementation-ledger.md`.

## Related

- Current data model: [../architecture/data-model.md](../architecture/data-model.md)
- Current repository contract: [../backend/README.md](../backend/README.md)
- Syllabification decision: [../adr/ADR-0008-orthographic-syllabification.md](../adr/ADR-0008-orthographic-syllabification.md)
- Timing decision: [../adr/ADR-0007-part-scoped-timing.md](../adr/ADR-0007-part-scoped-timing.md)
