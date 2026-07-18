import { Link } from "react-router-dom";
import { useI18n } from "../../../shared/i18n";
import { hasPropertyValue } from "../entryPropertyCatalog";
import type { Entry, EntryProperty } from "../types";

export function EntryPropertiesView({ properties = [], entries }: { properties?: EntryProperty[]; entries: Entry[] }) {
  const { t } = useI18n();
  const visible = properties.filter((property) => hasPropertyValue(property.value));
  if (!visible.length) return null;
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return <section className="grid gap-x-8 gap-y-0 border-y border-[var(--border)] py-2 sm:grid-cols-2">
    {visible.map((property) => <div key={property.id} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 border-b border-[var(--border)] py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"><span className="text-xs font-semibold text-[var(--text-faint)]">{property.label}</span><div className="text-sm leading-6 text-[var(--text-muted)]">{property.type === "entryReference" && Array.isArray(property.value) ? <div className="flex flex-wrap gap-1.5">{property.value.map((id) => { const entry = byId.get(id); return entry ? <Link key={id} to={`/entries/${id}`} className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold hover:text-[var(--accent)]">{entry.title}</Link> : null; })}</div> : Array.isArray(property.value) ? property.value.join(", ") : property.value || t("common.noContent")}</div></div>)}
  </section>;
}
