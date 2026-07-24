import type { LucideIcon } from "lucide-react";
import { useI18n } from "../../../../shared/i18n";

export type EditorInsertAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  group?: "world" | "basic";
  description?: string;
  recommended?: boolean;
  run: () => void;
};

export function EditorInsertPanel({
  actions,
  onClose,
}: {
  actions: EditorInsertAction[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const groups = ["world", "basic"] as const;
  return (
    <section className="ws-overlay-surface ws-popover-enter mx-auto mb-4 w-full max-w-5xl p-2">
      {groups.map((group) => {
        const groupedActions = actions
          .filter((action) => (action.group ?? "basic") === group)
          .map((action, index) => ({ action, index }))
          .sort((left, right) => Number(right.action.recommended) - Number(left.action.recommended) || left.index - right.index)
          .map(({ action }) => action);
        if (!groupedActions.length) return null;
        return <div key={group} className="p-1"><p className="px-2 pb-1 pt-1 text-[.62rem] font-bold uppercase tracking-[.14em] text-[var(--text-faint)]">{t(group === "world" ? "editor.commandGroupWorld" : "editor.commandGroupBasic")}</p><div className={`grid gap-1 ${group === "world" ? "sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"}`}>{groupedActions.map(({ id, label, description, recommended, icon: Icon, run }) => (
        <button
          key={id}
          type="button"
          onClick={() => {
            run();
            onClose();
          }}
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
        >
          <Icon size={16} className="shrink-0 text-[var(--accent)]" />
          <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><span className="truncate">{label}</span>{recommended ? <small className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[.56rem] font-bold uppercase tracking-wide text-[var(--accent-strong)]">{t("editor.recommended")}</small> : null}</span>{description ? <small className="mt-0.5 block truncate font-normal text-[var(--text-faint)]">{description}</small> : null}</span>
        </button>
      ))}</div></div>;
      })}
    </section>
  );
}
