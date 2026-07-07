import type { EntryType } from "../types";
import { getEntryTypeMeta } from "../utils/entryTypeMeta";

type EntryTypeBadgeProps = {
  type: EntryType;
  onClick?: () => void;
};

export function EntryTypeBadge({ type, onClick }: EntryTypeBadgeProps) {
  const meta = getEntryTypeMeta(type);

  const className = [
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
    meta.badgeClassName,
    onClick ? "hover:brightness-125" : "",
  ].join(" ");

  const content = (
    <>
      <span className={["h-1.5 w-1.5 rounded-full", meta.dotClassName].join(" ")} />
      {meta.label}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <span className={className}>{content}</span>;
}