import { formatVoices, getLineSyllableText } from "@/lib/annotationUtils";
import { getTechniqueById } from "@/lib/defaultTechniques";
import type { SongSection } from "@/lib/songTypes";

type RawMarkupPreviewProps = {
  sections: SongSection[];
};

export function RawMarkupPreview({ sections }: RawMarkupPreviewProps) {
  return (
    <details className="rounded-2xl border border-border bg-card/70 p-4">
      <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Raw Markup Preview
      </summary>
      <div className="mt-4 flex flex-col gap-4 font-mono text-xs leading-6 text-muted-foreground">
        {sections.map((section) => (
          <div key={section.id}>
            <p className="font-semibold text-foreground">{section.name}</p>
            {section.lines.map((line) => (
              <div key={line.id} className="mt-2 rounded-md bg-muted/40 p-3">
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
                  <p className="text-muted-foreground">No annotations on this line.</p>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}
