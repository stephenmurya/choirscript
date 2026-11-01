# Architecture — Asset Rights and Storage

**Purpose:** what media Choirscript will hold, who owns it, what may be published, and how it is
stored. **Status: NOT STARTED** — today the only stored artifact is the share JSON.

## Why this exists before AI

The moment a stem or a separated vocal part exists, three questions become legal rather than
technical: may it be generated, may it be stored, and may it be published? Getting the model
right now is cheaper than retrofitting consent and takedowns after a library of audio exists.

## Asset classes

| Class | Example | Rights basis | Publishable |
| --- | --- | --- | --- |
| Composition | Lyrics + melody of a hymn | Public domain or licensed | Per declaration |
| Arrangement (text) | SATB notes for a known song | Arranger's rights over the arrangement, not the composition | Per declaration |
| Original composition | A director's own song | Creator owns | Yes |
| Uploaded recording | A choir's rehearsal mp3 | Recorder/performers' rights | Only with consent |
| Separated stems (AI) | Vocal/instrumental split of an upload | **Derivative of the upload** — inherits its rights | Only if the source was publishable |
| SATB-separated parts (AI) | Four vocal stems | Derivative | Only if the source was publishable |
| Prepared backing track | Made in a DAW | Depends on every sample used | Only with a rights declaration listing sources |
| Sample pack / loop | Producer asset | Producer's own or licensed | Only when verified |

**Rule:** a generated stem is not new ownership. Separation does not launder rights, and an
AI-generated derivative of an in-copyright recording is still a derivative.

## Rights declaration

```ts
type RightsDeclaration = {
  composition: "public-domain" | "licensed" | "original" | "unknown";
  licenceReference?: string;         // contract id, publisher, or licence text URL
  recordingPermission?: "owner" | "performer-consent" | "not-applicable";
  territory?: string[];
  declaredBy: string;
  declaredAt: string;
  notes?: string;
};
```

- Required for `visibility: "public"`; optional for unlisted/private.
- Stored immutably with the publication revision (a declaration is evidence, not a setting).
- Shown on the public page in human terms ("Public domain composition · Arrangement © creator").
- `"unknown"` is allowed for private work and blocks public publishing.

## Storage layout (target: Cloudflare R2)

```text
publications/{publicationId}/revisions/{revisionId}.json     # compiled score / payload
publications/{publicationId}/assets/{assetId}/original.{ext}
publications/{publicationId}/assets/{assetId}/stems/{name}.{ext}
orgs/{organisationId}/library/{assetId}/…
```

Rules:

- **Immutable objects.** A revision's JSON never changes; a new revision is a new key.
- **Content-addressed where possible** (`sha256` prefix) to dedupe repeated uploads.
- **No public buckets.** All reads go through signed, short-lived URLs, or a Worker that checks
  entitlement per request.
- **Lifecycle**: originals retained per subscription tier; stems pruned after N months of
  inactivity for free tier (documented, with a warning email before deletion).
- **Metadata in Postgres**, bytes in R2. Never rely on object listings for listing assets.

## Access control

| Viewer | Allowed |
| --- | --- |
| Anonymous on a public arrangement | Stream public stems if the declaration permits |
| Signed-in non-member | Same as anonymous |
| Member of the organisation | Stream all assets of that organisation |
| Owner | Upload, replace, delete, change declaration |
| Admin (Murya) | No raw asset access by default; metadata and moderation actions only |

Signed URLs should expire in minutes, be bound to a publication revision, and never be logged in
full.

## Takedown and moderation

Minimum viable process, deliberately manual:

1. A `reports` table: `{ assetId | publicationId, reporterEmail, reason, evidenceUrl, status }`.
2. Unpublish is instant and does not require the owner's cooperation (a `publications.status =
   'suspended'` transition).
3. Suspension is reversible; deletion is not. Default to suspension.
4. A public contact route (`/legal/takedown`) and a stated response window.
5. Preserve evidence: the snapshot of what was published, so a dispute can be reviewed after the
   fact.

## What this implies for the current product

- Nothing needs to change before AI exists, except one small thing: **do not publish share links
  that carry audio**, and keep the rights fields out of the current share payload until the
  publication model exists.
- When the publication model lands, `song.share` should grow into a `publication` record with a
  rights declaration, rather than accumulating ad-hoc fields.

## Open questions

1. Who verifies a "licensed" declaration? Recommendation: nobody at first; rely on reporting and
   suspension, and only verify creators who sell.
2. Do we allow uploading a recording that is *not* publishable, purely for private stem work?
   Recommendation: yes, but it counts against storage and cannot be shared until rights are
   declared.
3. Retention for AI stems on the free tier: 30 days is defensible if disclosed at upload.
