import assert from "node:assert/strict";
import { deleteLine, createEmptySong, createLineFromText, createWordToken } from "../src/lib/songStorage";
import { preparePendingSyllabification, reconcileLineText, reconcileLineTiming } from "../src/lib/lineText";
import { splitWordIntoSyllables } from "../src/lib/syllableSplitter";
import { ensureTimingForSong } from "../src/lib/timing";

function validateSyllabifier() {
  const corpus: Array<[string, string[]]> = [
    ["overcame", ["o", "ver", "came"]],
    ["triumph", ["tri", "umph"]],
    ["amazing", ["a", "maz", "ing"]],
    ["hallelujah", ["hal", "le", "lu", "jah"]],
    ["forever", ["for", "ev", "er"]],
    ["victory", ["vic", "to", "ry"]],
    ["faithful", ["faith", "ful"]],
    ["Jesus", ["Je", "sus"]],
    ["worthy", ["wor", "thy"]],
    ["glory", ["glo", "ry"]],
    ["heaven", ["heav", "en"]],
    ["beautiful", ["beau", "ti", "ful"]],
    ["savior", ["sav", "ior"]],
    ["Amazing,", ["A", "maz", "ing,"]],
  ];

  for (const [word, expected] of corpus) {
    assert.deepEqual(splitWordIntoSyllables(word), expected, `unexpected split for ${word}`);
  }
}

function validateReconciliation() {
  const original = createLineFromText("amazing grace", "auto");
  const grace = original.words[1];
  const graceSyllable = grace.syllables[0];
  graceSyllable.techniques = [{ techniqueId: "crescendo" }];
  original.annotations = [{
    id: "annotation_grace",
    techniqueId: "crescendo",
    syllableIds: [graceSyllable.id],
    appliesTo: ["all"],
    createdAt: new Date(0).toISOString(),
  }];

  const song = ensureTimingForSong({
    ...createEmptySong(),
    mode: "advanced",
    source: { sections: [{ id: "section_1", name: "Verse 1", lines: [original] }] },
  });
  const timing = song.timingByLine[original.id];
  assert.ok(timing);

  const nextLine = reconcileLineText(original, "amazing grace is");
  const nextGrace = nextLine.words[1];
  assert.equal(nextGrace.id, grace.id, "unchanged words keep their IDs");
  assert.equal(nextGrace.syllables[0].id, graceSyllable.id, "unchanged syllables keep their IDs");
  assert.deepEqual(nextGrace.syllables[0].techniques, [{ techniqueId: "crescendo" }]);
  assert.deepEqual(nextLine.annotations[0].syllableIds, [graceSyllable.id]);
  assert.equal(nextLine.words[2].syllabification, "pending", "new words remain plain in Lyrics");

  const nextTiming = reconcileLineTiming(timing, nextLine);
  assert.ok(nextTiming.sharedEvents.some((event) => event.syllableId === graceSyllable.id));

  const deletedLine = reconcileLineText(original, "grace");
  const prunedTiming = reconcileLineTiming(timing, deletedLine);
  assert.ok(prunedTiming.sharedEvents.every((event) => event.syllableId !== original.words[0].syllables[0].id));
}

function validatePreparationAndDeletion() {
  const pending = createLineFromText("overcame triumph");
  const manualWord = createWordToken("custom", "manual");
  const manualSyllables = manualWord.syllables.map((syllable) => ({ ...syllable, text: "cus" }));
  const manualSyllableTexts = manualSyllables.map((syllable) => syllable.text);
  const manual = { ...createLineFromText("", "pending"), words: [{ ...manualWord, syllables: manualSyllables }] };
  const empty = createEmptySong();
  const song = {
    ...empty,
    source: { sections: [{ id: "section_1", name: "Verse 1", lines: [pending, manual] }] },
  };

  const prepared = preparePendingSyllabification(song);
  assert.equal(prepared.changed, true);
  assert.deepEqual(prepared.song.source.sections[0].lines[0].words.map((word) => word.syllabification), ["auto", "auto"]);
  assert.deepEqual(prepared.song.source.sections[0].lines[0].words[0].syllables.map((syllable) => syllable.text), ["o", "ver", "came"]);
  assert.equal(prepared.song.source.sections[0].lines[1].words[0].syllabification, "manual");
  assert.deepEqual(prepared.song.source.sections[0].lines[1].words[0].syllables.map((syllable) => syllable.text), manualSyllableTexts);
  assert.equal(preparePendingSyllabification(prepared.song).changed, false);

  const otherLine = createLineFromText("keep");
  const timed = {
    ...prepared.song,
    source: { sections: [{ ...prepared.song.source.sections[0], lines: [pending, otherLine] }] },
    timingByLine: { [pending.id]: { lineId: pending.id, bars: [], sharedEvents: [], partOverrides: {} }, [otherLine.id]: { lineId: otherLine.id, bars: [], sharedEvents: [], partOverrides: {} } },
  };
  const deleted = deleteLine(timed, "section_1", pending.id);
  assert.deepEqual(deleted.source.sections[0].lines.map((line) => line.id), [otherLine.id]);
  assert.equal(deleted.timingByLine[pending.id], undefined);
  assert.ok(deleted.timingByLine[otherLine.id]);
}

validateSyllabifier();
validateReconciliation();
validatePreparationAndDeletion();
console.log("Phase 3D editor validation passed.");
