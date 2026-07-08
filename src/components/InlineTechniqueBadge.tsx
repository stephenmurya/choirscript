import { getTechniqueById } from "@/lib/defaultTechniques";
import type { TechniqueAnnotation } from "@/lib/songTypes";
import { TechniqueBadge } from "./TechniqueBadge";

type InlineTechniqueBadgeProps = {
  annotation: TechniqueAnnotation;
  selected?: boolean;
  onSelect?: (annotationId: string) => void;
};

export function InlineTechniqueBadge({
  annotation,
  selected = false,
  onSelect,
}: InlineTechniqueBadgeProps) {
  const technique = getTechniqueById(annotation.techniqueId);

  if (!technique) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(annotation.id)}
      title={`${technique.name}: ${technique.description}`}
      className={`inline-flex rounded-full transition ${
        selected ? "ring-2 ring-slate-900 ring-offset-1" : "hover:brightness-95"
      }`}
    >
      <TechniqueBadge technique={technique} compact />
    </button>
  );
}
