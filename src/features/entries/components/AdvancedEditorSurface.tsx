import { lazy, Suspense, useState } from "react";

import { useI18n } from "../../../shared/i18n";
import { EditorRecoveryBoundary } from "./EditorRecoveryBoundary";
import { RecoveryContentEditor } from "./RecoveryContentEditor";
import type { ReferenceEntry } from "./EntryReferenceMenu";
import type { EntryType } from "../types";

type AdvancedEditorSurfaceProps = {
  entryId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  referenceEntries: ReferenceEntry[];
  entryType: EntryType;
};

function createLazyEditor() {
  return lazy(() =>
    import("./RichTextEditor").then((module) => ({
      default: module.RichTextEditor,
    })),
  );
}

// Each wrapper owns a separate React.lazy promise. Moving to the next wrapper
// is what makes retry genuine instead of replaying React's cached rejection.
const lazyEditorAttempts = Array.from({ length: 6 }, createLazyEditor);

export function AdvancedEditorSurface({
  entryId,
  value,
  onChange,
  placeholder,
  referenceEntries,
  entryType,
}: AdvancedEditorSurfaceProps) {
  const { t } = useI18n();
  const [attempt, setAttempt] = useState(0);
  const LazyEditor = lazyEditorAttempts[Math.min(attempt, lazyEditorAttempts.length - 1)];

  function retry() {
    // React.lazy retains a rejected promise. A new component type is required
    // for a real second import attempt after the dev server or network recovers.
    setAttempt((current) => Math.min(current + 1, lazyEditorAttempts.length - 1));
  }

  return (
    <EditorRecoveryBoundary
      key={`${entryId}:${attempt}`}
      resetKey={`${entryId}:${attempt}`}
      fallback={(error) => (
        <RecoveryContentEditor
          value={value}
          onChange={onChange}
          onRetry={retry}
          failure={error}
        />
      )}
    >
      <Suspense
        fallback={
          <div
            aria-busy="true"
            aria-label={t("editor.loading")}
            className="mx-auto min-h-[36rem] w-full max-w-5xl animate-pulse rounded-[.75rem] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_72%,transparent)]"
          />
        }
      >
        <LazyEditor
          value={value}
          onChange={onChange}
          editable
          placeholder={placeholder}
          referenceEntries={referenceEntries}
          entryType={entryType}
        />
      </Suspense>
    </EditorRecoveryBoundary>
  );
}
