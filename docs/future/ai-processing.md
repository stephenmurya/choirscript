# Future Module — AI Music Processing

**Purpose:** requirements for turning an uploaded recording into an editable draft arrangement.
**Status: NOT STARTED, DEFERRED until after the infrastructure move.** Nothing here is costed as
factual; provider prices and capabilities must be verified at implementation time.

## What the user gets

Upload a recording of a song (a live choir, a studio mix, a phone memo of a rehearsal), wait, and
receive a draft in the normal editor: lyrics split into sections, syllables aligned to beats,
and — where the pipeline supports it — tentative SATB parts as tonic-solfa. The director then
corrects it. The value is not perfect transcription; it is deleting 80% of the typing.

## Pipeline

```text
upload ──► normalise audio (mono/stereo, 44.1k, loudness)
       ──► vocal separation        (Music AI / Moises / MVSEP)
       ──► [optional] SATB separation (MVSEP, unverified quality)
       ──► lyrics transcription + word timing
       ──► beat/tempo/key detection
       ──► section detection
       ──► pitch tracking per part ──► tonic-solfa tokens
       ──► draft Song (pending words, provisional notes)
       ──► review UI ──► accepted draft enters the editor
```

Three routes to consider for parts, in increasing cost:

1. **Full mix → SATB separation** — cheapest, highest risk of bleed and wrong assignment.
2. **Full mix → vocals → SATB separation** — the mainstream approach; two model passes.
3. **User-supplied per-part recordings** (four phone takes) — best quality, zero separation risk,
   and a genuinely useful fallback to offer first because it is deterministic.

Recommendation: ship route 3 first (it needs alignment and pitch tracking only), then route 2.

## Provider modules to evaluate

| Capability | Candidate | Verify before committing |
| --- | --- | --- |
| Stem separation (vocals/instrumental) | Music AI (Moises), MVSEP | Quality on choir material, latency, per-minute cost, commercial terms |
| Lead/backing vocal split | Music AI | Whether choir unison defeats the model |
| Lyrics transcription | Music AI, or a speech model | Choral diction, non-English lyrics |
| Word/syllable alignment | Music AI or forced alignment | Alignment to *our* syllable model, not just words |
| Beat/tempo/key detection | Music AI | Compound meters (6/8) where our timing model is weakest |
| Section detection | Music AI | Reliability on verse/chorus repetition |
| SATB separation | MVSEP (proposed) | **Unverified.** Benchmark before designing around it |
| Pitch tracking per part | Any usable mono pitch tracker | Monophonic only; polyphony within a part is a failure mode |

## Review interface

Must never overwrite a curated arrangement.

- The draft opens in the editor as a new song (or a new arrangement), clearly labelled *AI draft*.
- Confidence is shown per section/line: low-confidence syllables are highlighted, not silently
  accepted.
- Word timings and detected sections are editable before notes are trusted.
- "Accept draft" creates a revision with `source: "ai"` so provenance is auditable.

## Job model

```ts
type ProcessingJob = {
  id: string;
  organisationId: string; userId: string;
  inputAssetId: string;
  route: "user-parts" | "mix-to-satb" | "mix-to-vocals-to-satb";
  stage: "queued" | "normalising" | "separating" | "aligning" | "transcribing" | "done" | "failed";
  provider: string;
  inputSeconds: number;
  costEstimate: number;      // in provider currency units
  creditsCharged: number;    // refunded on failure
  error?: string;
  createdAt: string; updatedAt: string;
};
```

- Asynchronous, resumable per stage; each stage's output is an asset so a retry does not re-run
  earlier stages.
- Concurrency capped per organisation to protect both providers and margins.
- Progress is visible (queued → stage → done) because a 5-minute silence reads as a bug.

## Economics

Cost per song is dominated by audio minutes × number of passes. A three-pass pipeline on a
4-minute song is 12 provider-minutes before retries. Free tier must therefore **not** include AI;
Pro gets a monthly allowance; retries after a provider failure are not charged.

Margin rule: price the tier so that the 90th-percentile user consumes < 40% of the plan price in
provider cost. Measure before publishing prices.

## Hard requirements

1. Rights: an upload may only be processed if the uploader declares a basis; see
   `../architecture/asset-rights-and-storage.md`.
2. Privacy: uploads are private by default and never used for training without explicit consent.
3. Deletion: a user-initiated delete removes the original and every derived asset.
4. Failure is honest: a partial draft is labelled partial, never silently salvaged into a wrong
   arrangement.

## Risks

- **SATB separation quality is unproven** on amateur choir recordings; benchmark before promising.
- **Compound meter detection** is the most likely systematic error, and it corrupts the timing
  model downstream.
- **Lyric transcription of sung text** is materially worse than speech; a "draft lyrics" that is
  30% wrong may cost more correction time than typing. Test with real users before shipping.
- **Cost overrun** from retries and long files; enforce duration limits (e.g. 8 minutes) at upload.
