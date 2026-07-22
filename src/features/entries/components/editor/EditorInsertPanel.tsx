import type { LucideIcon } from "lucide-react";

export type EditorInsertAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
};

export function EditorInsertPanel({
  actions,
  onClose,
}: {
  actions: EditorInsertAction[];
  onClose: () => void;
}) {
  return (
    <section className="ws-popover-enter mx-auto mb-4 grid w-full max-w-5xl grid-cols-2 gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-2 shadow-lg sm:grid-cols-4">
      {actions.map(({ id, label, icon: Icon, run }) => (
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
          <span className="truncate">{label}</span>
        </button>
      ))}
    </section>
  );
}
