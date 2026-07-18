import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../../shared/i18n";
import { useSoftDialog } from "../../../shared/components/softDialogContext";
import { propertySuggestions } from "../entryPropertyCatalog";
import type { Entry, EntryProperty, EntryPropertyType, EntryType } from "../types";

function id() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? `property-${crypto.randomUUID()}` : `property-${Date.now()}`;
}

export function EntryPropertiesEditor({ type, properties, entries, onChange }: { type: EntryType; properties: EntryProperty[]; entries: Entry[]; onChange: (properties: EntryProperty[]) => void }) {
  const { t } = useI18n();
  const dialog = useSoftDialog();
  const [adding, setAdding] = useState(false);
  const suggestions = (propertySuggestions[type] ?? []).filter((suggestion) => !properties.some((property) => property.key === suggestion.key));

  function addSuggested(key: string) {
    const suggestion = suggestions.find((item) => item.key === key);
    if (!suggestion) return;
    onChange([...properties, { id: id(), key: suggestion.key, label: t(suggestion.labelKey), type: suggestion.type, value: suggestion.type === "entryReference" ? [] : "" }]);
    setAdding(false);
  }
  async function addCustom() {
    const label = await dialog.prompt({ message: t("property.customName"), confirmLabel: t("common.create") });
    if (!label?.trim()) return;
    onChange([...properties, { id: id(), label: label.trim(), type: "text", value: "" }]);
    setAdding(false);
  }
  function patch(propertyId: string, value: Partial<EntryProperty>) {
    onChange(properties.map((property) => property.id === propertyId ? { ...property, ...value } : property));
  }
  function move(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= properties.length) return;
    const next = [...properties];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return <section>
    <div className="mb-2 flex items-center justify-between"><div><h3 className="text-sm font-semibold">{t("property.title")}</h3><p className="mt-1 text-xs text-[var(--text-faint)]">{t("property.help")}</p></div></div>
    {properties.length ? <div className="space-y-2">{properties.map((property, index) => <div key={property.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <div className="flex items-center gap-2"><input value={property.label} onChange={(event) => patch(property.id, { label: event.target.value })} className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none" aria-label={t("property.label")} /><select value={property.type} onChange={(event) => patch(property.id, { type: event.target.value as EntryPropertyType, value: event.target.value === "entryReference" ? [] : "" })} className="rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] px-2 py-1 text-[10px]"><option value="text">{t("property.typeText")}</option><option value="longText">{t("property.typeLongText")}</option><option value="select">{t("property.typeSelect")}</option><option value="entryReference">{t("property.typeReference")}</option></select><button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="text-[var(--text-faint)] disabled:opacity-25" aria-label={t("property.moveUp")}><ArrowUp size={13} /></button><button type="button" disabled={index === properties.length - 1} onClick={() => move(index, 1)} className="text-[var(--text-faint)] disabled:opacity-25" aria-label={t("property.moveDown")}><ArrowDown size={13} /></button><button type="button" onClick={() => onChange(properties.filter((item) => item.id !== property.id))} className="text-red-400" aria-label={t("common.delete")}><Trash2 size={13} /></button></div>
      <div className="mt-2">{property.type === "entryReference" ? <select multiple value={Array.isArray(property.value) ? property.value : []} onChange={(event) => patch(property.id, { value: Array.from(event.target.selectedOptions, (option) => option.value) })} className="ws-input min-h-20 w-full rounded-lg px-2 py-1 text-xs">{entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} · {t(`type.${entry.type}`)}</option>)}</select> : property.type === "longText" ? <textarea value={Array.isArray(property.value) ? property.value.join(", ") : property.value} onChange={(event) => patch(property.id, { value: event.target.value })} rows={2} className="ws-input w-full resize-none rounded-lg px-3 py-2 text-xs" placeholder={t("property.valuePlaceholder")} /> : <input value={Array.isArray(property.value) ? property.value.join(", ") : property.value} onChange={(event) => patch(property.id, { value: event.target.value })} className="ws-input h-9 w-full rounded-lg px-3 text-xs" placeholder={t("property.valuePlaceholder")} />}</div>
    </div>)}</div> : null}
    <div className="relative mt-2"><button type="button" onClick={() => setAdding((value) => !value)} className="flex h-10 items-center gap-2 rounded-xl px-2 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"><Plus size={14} />{t("property.add")}</button>{adding ? <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-1.5 shadow-xl"><div className="max-h-48 overflow-y-auto">{suggestions.map((suggestion) => <button type="button" key={suggestion.key} onClick={() => addSuggested(suggestion.key)} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-[var(--surface-muted)]">{t(suggestion.labelKey)}</button>)}</div><button type="button" onClick={addCustom} className="mt-1 flex w-full items-center gap-2 border-t border-[var(--border)] px-3 py-2 pt-2 text-left text-xs font-semibold"><Plus size={13} />{t("property.custom")}</button></div> : null}</div>
  </section>;
}
