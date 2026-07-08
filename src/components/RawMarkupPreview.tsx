import { formatVoices, getLineSyllableText } from "@/lib/annotationUtils";
import { getTechniqueById } from "@/lib/defaultTechniques";
import type { SongSection } from "@/lib/songTypes";

type RawMarkupPreviewProps = {
  sections: SongSection[];
};

export function RawMarkupPreview({ sections }: RawMarkupPreviewProps) {
  return (
    <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
        Raw Markup Preview
      </summary>
      <div className="mt-4 space-y-4 font-mono text-xs leading-6 text-slate-700">
        {sections.map((section) => (
          <div key={section.id}>
            <p className="font-semibold text-slate-950">{section.name}</p>
            {section.lines.map((line) => (
              <div key={line.id} className="mt-2 rounded-md bg-slate-50 p-3">
                {line.annotations.map((annotation) => {
                  const technique = getTechniqueById(annotation.techniqueId);

                  if (!technique) {
                    return null;
                  }

                  return (
                    <p key={annotation.id}>
                      [{technique.name.toLowerCase()}:{" "}
                      {formatVoices(annotation.appliesTo).toLowerCase()}]{" "}
                      {getLineSyllableText(line, annotation.syllableIds)}
                    </p>
                  );
                })}
                {line.annotations.length === 0 ? (
                  <p className="text-slate-400">No annotations on this line.</p>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}
