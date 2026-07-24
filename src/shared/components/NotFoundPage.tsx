import { ArrowLeft, BookOpen, Compass } from "lucide-react";
import { Link } from "react-router-dom";

import { useI18n } from "../i18n";
import { MotionPage } from "./MotionPage";

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <MotionPage className="ws-compact-surface mx-auto max-w-3xl px-6 py-14 text-center sm:px-10 sm:py-20">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent-soft)] text-[var(--accent)]">
        <Compass size={28} strokeWidth={1.6} />
      </span>
      <p className="ws-eyebrow mt-7">{t("notFound.eyebrow")}</p>
      <h2 className="ws-display mt-3 text-5xl font-semibold text-[var(--text)]">
        {t("notFound.title")}
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--text-muted)]">
        {t("notFound.description")}
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to="/manuscript"
          className="ws-button-primary flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          {t("notFound.dashboard")}
        </Link>
        <Link
          to="/entries"
          className="ws-button-secondary flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
        >
          <BookOpen size={16} />
          {t("common.browseArchive")}
        </Link>
      </div>
    </MotionPage>
  );
}
