import type { MouseEvent } from "react";

import type { EntryType } from "../types";
import { getEntryTypeMeta } from "../utils/entryTypeMeta";

type EntryTypeBadgeProps = {
  type: EntryType;
  onClick?: () => void;
};

export function EntryTypeBadge({ type, onClick }: EntryTypeBadgeProps) {
  const meta = getEntryTypeMeta(type);

  const className = [
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] transition",
    meta.badgeClassName,
    onClick
      ? "cursor-pointer hover:border-[var(--border-strong)] hover:brightness-105"
      : "",
  ].join(" ");

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onClick?.();
  }

  const content = (
    <>
      <span
        className={["h-1.5 w-1.5 rounded-full", meta.dotClassName].join(" ")}
      />
      {meta.label}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={handleClick} className={className}>
        {content}
      </button>
    );
  }

  return <span className={className}>{content}</span>;
}