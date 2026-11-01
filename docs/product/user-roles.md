# Choirscript — User Roles and Permissions

**Purpose:** define who does what, and which of those roles exist in code today. This is the
authority for permission decisions until `../architecture/auth-and-ownership.md` replaces it with
a persisted model.

## Roles

| Role | Intent | Exists today |
| --- | --- | --- |
| **Owner** | Created the song or workspace; can publish, unpublish, delete, and invite | Yes — every workspace currently has exactly one, written at bootstrap |
| **Editor** | Can change song content but not publication or deletion | Named in `firestore.rules` (`hasWorkspaceRole` accepts a list); never granted |
| **Contributor** | Can propose changes and be attributed, without direct write access | No — dependent on `../architecture/contributions-and-revisions.md` |
| **Viewer** | Read-only access to a private or unlisted arrangement | No — links are anonymous, not role-based |
| **Organization admin** | Manages members, services, tiers for an ensemble | No — belongs to `../future/band-management.md` |

Two roles exist implicitly today and should be named in the UI rather than invented later:

- **Anonymous visitor** — anyone holding a `/s/{id}` link. No session, no identity, full read of
  that one song, no ability to save, comment or copy.
- **Signed-in user with no membership** — can sign in, gets a workspace and becomes its owner on
  first use. There is currently no way to be signed in and have access to *someone else's*
  content except through a share link.

## Ownership rules (target)

These are decisions to implement, not descriptions of the present code.

1. **Ownership is a record, not a flag on the song.** `ownerId` on an arrangement plus a
   membership row; deleting a user does not orphan content silently.
2. **Ownership is distinct from edit permission.** An editor can change notes; only an owner can
   publish, unpublish, transfer ownership or delete.
3. **Publication never grants edit rights.** A public arrangement is readable by anyone and
   writable by nobody except its owner and delegated editors.
4. **Duplication creates a new owner.** When a user duplicates a public arrangement, they own the
   copy, and the copy records `attribution: { sourceArrangementId, ownerHandle }`.
5. **Forking is not merging.** A proposed edit lives in an isolated proposal owned by the
   proposer until the owner accepts it (see contributions).
6. **Attribution survives edits.** Every revision records its author; the public page shows the
   arrangement's creator and, optionally, recent contributors.
7. **Recording ownership needs identity migration first.** Firebase `uid`s are not portable —
   `../architecture/migration-plan.md` treats identity mapping as a prerequisite for anything
   that persists ownership across the move.

## Permission matrix (target)

| Action | Owner | Editor | Contributor | Viewer | Anonymous |
| --- | --- | --- | --- | --- | --- |
| Read private song | ✓ | ✓ | ✓ | ✓ | ✗ |
| Read unlisted link | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read public arrangement | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit notes / lyrics / timing | ✓ | ✓ | ✗ | ✗ | ✗ |
| Propose an edit | ✓ | ✓ | ✓ | ✗ | ✗ (account required) |
| Accept a proposal | ✓ | ✗ | ✗ | ✗ | ✗ |
| Publish / unpublish | ✓ | ✗ | ✗ | ✗ | ✗ |
| Duplicate a public arrangement | ✓ | ✓ | ✓ | ✓ | ✓ (then sign in to save) |
| Invite members | ✓ | ✗ | ✗ | ✗ | ✗ |
| View attribution | ✓ | ✓ | ✓ | ✓ | ✓ |

"Duplicate then save" is deliberately allowed anonymously at the *read* stage and requires an
account at the *persist* stage: it is the acquisition loop described in
`../architecture/publication-and-seo.md`.

## What this implies for the current app

- The rules file already reads a `role` field, so adding a second member is a data-and-UI job
  before it is a security job.
- Nothing in the current UI distinguishes owner from editor, because nobody else can reach a song
  except through a read-only link.
- Publishing is currently an owner-only action in practice (it lives in the editor behind auth),
  but the link itself carries no identity — so revocation is impossible until H-08 is built.
