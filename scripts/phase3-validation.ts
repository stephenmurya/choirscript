import assert from "node:assert/strict";
import {
  deleteSourceSectionWithOccurrences,
  hasMeaningfulArrangement,
  resolveArrangement,
} from "../src/lib/arrangement";
import { deriveSongModulePresence } from "../src/lib/songSummary";
import {
  createEmptySong,
  createLineFromText,
  duplicateSong,
  normalizeSong,
} from "../src/lib/songStorage";
import { ensureTimingForSong } from "../src/lib/timing";
import type { Song } from "../src/lib/songTypes";

function makeSection(id: string, name: string, lyric: string) {
  const line = createLineFromText(lyric);
  return { id, name, lines: [line] };
}

function makeLegacySong(): Song {
  const current = createEmptySong();
  const sections = [
    makeSection("section_verse_1", "Verse 1", "first verse"),
    makeSection("section_chorus", "Chorus", "same chorus"),
    makeSection("section_verse_2", "Verse 2", "second verse"),
    makeSection("section_chorus_2", "Chorus 2", "same chorus"),
  ];
  const legacy = { ...current, sections } as unknown as Record<string, unknown>;
  delete legacy.source;
  delete legacy.arrangements;
  delete legacy.activeArrangementId;
  return {
    ...legacy,
    schemaVersion: 1,
    sections,
  } as unknown as Song;
}

function validateMigration() {
  const migrated = normalizeSong(makeLegacySong());
  assert.equal(migrated.schemaVersion, 2);
  assert.deepEqual(
    migrated.source.sections.map((section) => section.id),
    ["section_verse_1", "section_chorus", "section_verse_2", "section_chorus_2"],
  );
  assert.deepEqual(
    migrated.arrangements[0].occurrences.map((occurrence) => occurrence.sourceSectionId),
    migrated.source.sections.map((section) => section.id),
  );
  assert.equal(migrated.source.sections.length, 4, "duplicate-looking sections must not merge");
  assert.deepEqual(normalizeSong(migrated), migrated, "normalization must be idempotent");
}

function validateArrangementResolution() {
  const song = createEmptySong();
  const sourceSection = makeSection("section_chorus", "Chorus", "same chorus");
  const chorusId = sourceSection.id;
  const repeated = {
    ...song,
    source: { sections: [sourceSection] },
    arrangements: song.arrangements.map((arrangement) => ({
      ...arrangement,
      occurrences: [
        { id: "occ_a", sourceSectionId: chorusId },
        { id: "occ_b", sourceSectionId: chorusId },
        { id: "occ_c", sourceSectionId: chorusId },
      ],
    })),
  };
  const resolved = resolveArrangement(repeated);
  assert.deepEqual(resolved.map((item) => item.occurrenceId), ["occ_a", "occ_b", "occ_c"]);
  assert.equal(new Set(resolved.map((item) => item.section.id)).size, 1);
  assert.equal(hasMeaningfulArrangement(song), false);
  assert.equal(hasMeaningfulArrangement(repeated), true);
  assert.equal(deriveSongModulePresence(song).includes("arrangement"), false);
  assert.equal(deriveSongModulePresence(repeated).includes("arrangement"), true);
}

function validateDuplication() {
  const original = createEmptySong();
  const line = createLineFromText("grace");
  const syllableId = line.words[0].syllables[0].id;
  line.words[0].syllables[0].techniques = [{ techniqueId: "crescendo" }];
  line.annotations = [
    {
      id: "annotation_original",
      techniqueId: "crescendo",
      syllableIds: [syllableId],
      appliesTo: ["all"],
      createdAt: original.createdAt,
    },
  ];
  const sourceSection = { id: "section_chorus", name: "Chorus", lines: [line] };
  const timed = ensureTimingForSong({
    ...original,
    mode: "advanced",
    source: { sections: [sourceSection] },
    arrangements: [
      {
        ...original.arrangements[0],
        occurrences: [
          { id: "occ_original_a", sourceSectionId: sourceSection.id },
          { id: "occ_original_b", sourceSectionId: sourceSection.id },
        ],
      },
    ],
  });
  const originalLineTiming = timed.timingByLine[line.id];
  assert.ok(originalLineTiming);

  const copy = duplicateSong(timed);
  const copySection = copy.source.sections[0];
  const copyLine = copySection.lines[0];
  const copyTiming = copy.timingByLine[copyLine.id];
  assert.notEqual(copy.id, timed.id);
  assert.notEqual(copySection.id, sourceSection.id);
  assert.notEqual(copyLine.id, line.id);
  assert.notEqual(copyLine.words[0].syllables[0].id, syllableId);
  assert.equal(copyLine.annotations[0].syllableIds[0], copyLine.words[0].syllables[0].id);
  assert.ok(copyTiming);
  assert.equal(copyTiming.lineId, copyLine.id);
  assert.ok(copyTiming.bars.every((bar) => bar.lineId === copyLine.id));
  assert.ok(copyTiming.sharedEvents.every((event) => event.lineId === copyLine.id));
  assert.ok(
    copyTiming.sharedEvents
      .filter((event) => event.syllableId)
      .every((event) => event.syllableId === copyLine.words[0].syllables[0].id),
  );
  assert.deepEqual(
    copy.arrangements[0].occurrences.map((occurrence) => occurrence.sourceSectionId),
    [copySection.id, copySection.id],
  );
  assert.ok(copy.arrangements[0].occurrences.every((occurrence) => occurrence.id !== "occ_original_a"));

  const deleted = deleteSourceSectionWithOccurrences(timed, sourceSection.id);
  assert.equal(deleted.source.sections.length, 0);
  assert.equal(deleted.arrangements[0].occurrences.length, 0);
  assert.deepEqual(deleted.timingByLine, {});
}

validateMigration();
validateArrangementResolution();
validateDuplication();
console.log("Phase 3 domain validation passed.");
