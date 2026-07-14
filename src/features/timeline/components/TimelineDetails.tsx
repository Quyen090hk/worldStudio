import { Focus, Trash2, X } from "lucide-react";

import { useI18n } from "../../../shared/i18n";
import { formatWorldYear, type ResolvedTimelineItem } from "../timelineModel";

type RelationshipSummary = {
  id: string;
  sourceEntryId: string;
  targetEntryId: string;
  type: string;
  inverseLabel: string;
};

export function TimelineDetails({
  item,
  relationships,
  deleteItem,
  close,
  openEntry,
  openGraph,
}: {
  item: ResolvedTimelineItem;
  relationships: RelationshipSummary[];
  deleteItem: (id: string) => void;
  close: () => void;
  openEntry: () => void;
  openGraph: () => void;
}) {
  const { locale, t } = useI18n();
  const related = item.focusEntryId
    ? relationships.filter(
        (relationship) =>
          relationship.sourceEntryId === item.focusEntryId ||
          relationship.targetEntryId === item.focusEntryId,
      )
    : [];

  return (
    <aside className="absolute bottom-3 right-3 top-3 z-40 w-80 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-3 w-3 rounded-full" style={{ background: item.color }} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-faint)]">
            {item.source === "relationship"
              ? t("timeline.graphRelationship")
              : item.lane === "Relationships"
                ? t("timeline.relationships")
                : t(`timeline.category.${item.lane}`)}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
        </div>
        <button type="button" onClick={close}><X size={16} /></button>
      </div>
      <p className="mt-4 text-sm font-semibold">
        {formatWorldYear(item.startYear, locale)}
        {item.endYear !== null ? ` — ${formatWorldYear(item.endYear, locale)}` : ""}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-md bg-[var(--surface-muted)] px-3 py-2">
          <span className="block text-[var(--text-faint)]">{t("timeline.significance")}</span>
          <b className="mt-1 block tracking-[.12em]">{"★".repeat(item.importance)}{"☆".repeat(5 - item.importance)}</b>
        </div>
        <div className="rounded-md bg-[var(--surface-muted)] px-3 py-2">
          <span className="block text-[var(--text-faint)]">{t("timeline.status")}</span>
          <b className="mt-1 block capitalize">{item.certainty}</b>
        </div>
      </div>
      {item.entryType ? <p className="mt-2 text-[10px] text-[var(--text-faint)]">{t("timeline.canonicalSource", { type: t(`type.${item.entryType}`) })}</p> : null}
      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{item.summary || t("timeline.noNote")}</p>
      {item.tags.length ? <div className="mt-3 flex flex-wrap gap-1">{item.tags.map((tag) => <span key={tag} className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px]">#{tag}</span>)}</div> : null}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {item.entryId ? <button type="button" onClick={openEntry} className="ws-button-secondary h-9 rounded-md text-xs">{t("timeline.openEntry")}</button> : null}
        <button type="button" onClick={openGraph} className="ws-button-secondary flex h-9 items-center justify-center gap-2 rounded-md text-xs"><Focus size={13} />{t("timeline.localGraph")}</button>
      </div>
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-faint)]">{t("timeline.connectedKnowledge", { count: related.length })}</p>
      <div className="mt-2 space-y-1">
        {related.slice(0, 8).map((relationship) => <div key={relationship.id} className="rounded-md bg-[var(--surface-muted)] px-3 py-2 text-xs">{relationship.sourceEntryId === item.focusEntryId ? relationship.type : relationship.inverseLabel}</div>)}
      </div>
      {item.source === "entry" ? (
        <button type="button" onClick={() => { deleteItem(item.id); close(); }} className="mt-6 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-red-500/10 text-xs text-red-500"><Trash2 size={13} />{t("timeline.removeFromChronicle")}</button>
      ) : <p className="mt-6 text-[10px] leading-4 text-[var(--text-faint)]">{t("timeline.generatedRelationshipHelp")}</p>}
    </aside>
  );
}
