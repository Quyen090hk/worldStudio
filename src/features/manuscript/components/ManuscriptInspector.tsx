import { CalendarDays, MapPin, Users } from "lucide-react";

import { useI18n } from "../../../shared/i18n";
import type { Entry } from "../../entries/types";
import type { TimelineItem } from "../../timeline/types";
import type { ManuscriptNode, ManuscriptNodeStatus } from "../types";
import { SelectMenu } from "../../../shared/components/SelectMenu";

type Props = {
  node: ManuscriptNode;
  entries: Entry[];
  timelineItems: TimelineItem[];
  onChange: (patch: Partial<Pick<ManuscriptNode, "status" | "povEntryId" | "characterEntryIds" | "locationEntryIds" | "timelineItemIds">>) => void;
};

function ToggleList({ values, selected, onChange }: { values: { id: string; label: string }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  if (!values.length) return null;
  return <div className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1">{values.map((value) => <label key={value.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"><input type="checkbox" checked={selected.includes(value.id)} onChange={() => onChange(selected.includes(value.id) ? selected.filter((id) => id !== value.id) : [...selected, value.id])} className="accent-[var(--accent)]" /><span className="truncate">{value.label}</span></label>)}</div>;
}

export function ManuscriptInspector({ node, entries, timelineItems, onChange }: Props) {
  const { t } = useI18n();
  const characters = entries.filter((entry) => entry.type === "Character").map((entry) => ({ id: entry.id, label: entry.title }));
  const locations = entries.filter((entry) => entry.type === "Location").map((entry) => ({ id: entry.id, label: entry.title }));
  const events = timelineItems.map((item) => ({ id: item.id, label: item.title || item.description }));
  const statuses: ManuscriptNodeStatus[] = ["idea", "outline", "draft", "revised", "final"];

  if (node.kind === "volume") return null;
  return <aside className="border-t border-[var(--border)] p-4 xl:border-l xl:border-t-0">
    <p className="ws-eyebrow">{t("manuscript.inspector")}</p>
    <label className="mt-4 block text-xs font-semibold text-[var(--text-faint)]">{t("manuscript.status")}<SelectMenu value={node.status} onChange={(status) => onChange({ status: status as ManuscriptNodeStatus })} ariaLabel={t("manuscript.status")} options={statuses.map((status) => ({ value: status, label: t(`manuscript.status.${status}`) }))} className="mt-2 h-10 w-full" /></label>
    <label className="mt-4 block text-xs font-semibold text-[var(--text-faint)]">{t("manuscript.pov")}<SelectMenu value={node.povEntryId ?? ""} onChange={(povEntryId) => onChange({ povEntryId: povEntryId || null })} ariaLabel={t("manuscript.pov")} options={[{ value: "", label: t("manuscript.none") }, ...characters.map((entry) => ({ value: entry.id, label: entry.label }))]} className="mt-2 h-10 w-full" /></label>
    <details className="mt-4 border-t border-[var(--border)] pt-3" open><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold"><Users size={14} />{t("manuscript.characters")}<span className="ml-auto text-[var(--text-faint)]">{node.characterEntryIds.length}</span></summary><ToggleList values={characters} selected={node.characterEntryIds} onChange={(characterEntryIds) => onChange({ characterEntryIds })} /></details>
    <details className="mt-3 border-t border-[var(--border)] pt-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold"><MapPin size={14} />{t("manuscript.locations")}<span className="ml-auto text-[var(--text-faint)]">{node.locationEntryIds.length}</span></summary><ToggleList values={locations} selected={node.locationEntryIds} onChange={(locationEntryIds) => onChange({ locationEntryIds })} /></details>
    <details className="mt-3 border-t border-[var(--border)] pt-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold"><CalendarDays size={14} />{t("manuscript.timelineLinks")}<span className="ml-auto text-[var(--text-faint)]">{node.timelineItemIds.length}</span></summary><ToggleList values={events} selected={node.timelineItemIds} onChange={(timelineItemIds) => onChange({ timelineItemIds })} /></details>
  </aside>;
}
