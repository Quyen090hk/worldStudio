import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectMenuOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  buttonClassName = "",
  disabled = false,
}: {
  value: T;
  options: SelectMenuOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 256 });
  const selected = options.find((option) => option.value === value) ?? options[0];

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 6;
    const availableBelow = window.innerHeight - rect.bottom - gap - 12;
    const availableAbove = rect.top - gap - 12;
    const openAbove = availableBelow < 180 && availableAbove > availableBelow;
    const maxHeight = Math.max(120, Math.min(320, openAbove ? availableAbove : availableBelow));
    setPosition({
      top: openAbove ? Math.max(12, rect.top - maxHeight - gap) : rect.bottom + gap,
      left: Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - rect.width - 12)),
      width: rect.width,
      maxHeight,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    window.addEventListener("pointerdown", closeOutside);
    return () => window.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`)?.focus());
  }, [open, value]);

  function moveFocus(direction: 1 | -1) {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])') ?? []);
    if (!items.length) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    items[(index + direction + items.length) % items.length]?.focus();
  }

  return <div ref={rootRef} className={`relative ${className}`}>
    <button
      ref={triggerRef}
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-controls={listId}
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
      onKeyDown={(event) => {
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
          event.preventDefault();
          setOpen(true);
        }
      }}
      className={`ws-input flex h-full min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm ${buttonClassName}`}
    >
      <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
      <ChevronDown size={14} className={`shrink-0 text-[var(--text-faint)] transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open ? createPortal(<div
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label={ariaLabel}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          moveFocus(event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        } else if (event.key === "Tab") setOpen(false);
      }}
      className="ws-dropdown-surface ws-popover-enter fixed z-[150] overflow-y-auto p-1.5"
      style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
    >
      {options.map((option) => <button
        key={option.value}
        type="button"
        role="option"
        data-value={option.value}
        aria-selected={option.value === value}
        aria-disabled={option.disabled || undefined}
        disabled={option.disabled}
        onClick={() => {
          onChange(option.value);
          setOpen(false);
          triggerRef.current?.focus();
        }}
        className="ws-dropdown-item flex min-h-10 w-full items-center gap-3 px-3 py-2 text-left text-sm disabled:opacity-40"
      >
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {option.value === value ? <Check size={14} className="shrink-0 text-[var(--accent)]" /> : null}
      </button>)}
    </div>, document.body) : null}
  </div>;
}
