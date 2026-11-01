# Future Module — Band, Choir and Music Ministry Management

**Purpose:** requirements for the organisation tier: people, services, repertoire, rehearsals,
development and analytics. **Status: NOT STARTED, DEFERRED** until the editor and publication
foundation are stable.

## Design principle

Model **ensembles and events**, not church services. A Sunday-morning service with three songs and
a Wednesday rehearsal is one instance of the model, not the model itself. Nothing may hardcode
Sunday, a fixed number of services, or "worship set".

## People and teams

```ts
type Member = {
  id: string; organisationId: string; userId?: string;   // may be a managed, non-user record
  displayName: string;
  capabilities: Capability[];        // voice parts, instruments, leadership — not mutually exclusive
  availability: AvailabilityRule[];
  status: "active" | "inactive" | "guest";
  joinedAt: string;
};

type Capability = { kind: "voice" | "instrument" | "leadership";
  value: "soprano" | "alto" | "tenor" | "bass" | "piano" | "drums" | … ;
  level?: "beginner" | "intermediate" | "advanced"; };
```

- A member can be a soprano **and** a keyboardist **and** a section leader. The old
  vocalist/instrumentalist dichotomy is explicitly rejected.
- Not every member needs a user account; a leader must be able to roster someone who never signs
  in. Their record can later be claimed.
- Teams group members inside an organisation (choir, band, youth ensemble) with their own roster.

## Events and services

- Event types are user-defined: service, rehearsal, concert, class, one-off.
- Recurring templates with exceptions (skip a week, add a second service at Christmas).
- An event has a schedule (start/end), a location, a leader, and a running order.
- Multiple services on one day are normal; so are zero.

## Music planning

```ts
type EventItem = {
  eventId: string; position: number;
  arrangementId: string;            // specific arrangement, not "the song"
  segment: string;                  // "opening", "praise", "communion" — free text
  leaders: MemberId[];              // song leader, worship leader
  assignments: { memberId: string; role: "vocal" | "instrumental"; part?: VocalPart; primary: boolean }[];
  key?: string;                     // may override the arrangement's key
  status: "planned" | "confirmed" | "rehearsed" | "needs-work";
  cues?: string;                    // transitions, endings, spoken intro
};
```

- Setlists are ordered `EventItem`s; a song can appear twice in one event (reprised).
- Assignments support a primary and a backup — this is how real rotas work.
- "Needs work" is set from a rehearsal note, not guessed.

## Rehearsals and attendance

- Rehearsals are events with an agenda: the arrangements to work on, in order.
- Attendance states: present, late, excused, absent — with a note.
- Rehearsal notes attach to an arrangement, a line or a section, and can be marked resolved.
  The unresolved list is what the next rehearsal opens with; that is the feature.
- A song's readiness is derived from its unresolved notes plus its last assignment change.

## Development

Track competencies separately: vocal (pitch accuracy, breath, range), instrumental, leadership
(reliability, preparation). No single "score". Evidence is a dated observation tied to a rehearsal
or event, plus optional goals. Growth history is a timeline, not a number.

## Analytics

Only what drives a decision:

- Attendance trend per member and per team.
- Instrument coverage gaps for the next 4 weeks ("no drummer on the 14th").
- Repertoire repetition (same song 4 weeks running).
- Readiness: how many assignments are still `planned` for the next event.
- Unresolved rehearsal notes aged > 2 weeks.
- Workload distribution (the same three people on every rota).

## Member experience

A member opens the app to one screen: my next service, my parts, my rehearsal schedule, the
arrangement for my part at large type, and a way to say I cannot make it. Everything else is
secondary and must not appear on that screen.

## Sharing and notifications

- WhatsApp sharing of a rehearsal link is the current de facto workflow and must be supported
  before any internal chat exists. Do not build chat early.
- Notifications: assignment changes, rehearsal reminders, new service published. Email first;
  WhatsApp/push later.

## Dependencies

1. Identity, organisations and membership (`../architecture/auth-and-ownership.md`).
2. Publication: a roster item must link to an arrangement that a singer can actually open.
3. Server-side scheduling and notifications (Queues/Cron).
4. Per-part rehearsal view (G-10) — the member experience is weak without it.

## Deliberately out of scope

- Chat.
- Payroll or expense handling.
- Livestreaming.
- Fixed liturgical calendars.
