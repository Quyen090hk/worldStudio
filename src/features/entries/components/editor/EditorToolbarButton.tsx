import type { ReactNode } from "react";

export function EditorToolbarButton({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex h-9 w-9 items-center justify-center rounded-xl border text-[var(--text-muted)] transition",
        active
          ? "border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
          : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
        disabled ? "opacity-40" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
