import { BookOpen, FileUp, Moon, Sparkles, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { useI18n } from "../../shared/i18n";
import { LanguageMenu } from "../../shared/components/LanguageMenu";
import { useSoftDialog } from "../../shared/components/softDialogContext";
import { pressTap } from "../../shared/motion/presets";
import { useOpeningQuotes } from "../../shared/opening/useOpeningQuotes";
import { useTheme } from "../../shared/theme/ThemeContext";
import {
  MAX_BACKUP_FILE_BYTES,
  parseWorkspaceBackup,
} from "../settings/workspaceBackup";
import { createWorld, createWorldFromBackup } from "./worldWorkspace";

export function WorldSetupPage() {
  const { t } = useI18n();
  const dialog = useSoftDialog();
  const { theme, setTheme } = useTheme();
  const { quote } = useOpeningQuotes();
  const ThemeIcon = theme === "dark" ? Moon : Sun;
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState<"create" | "import" | null>(null);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy("create");
    setError("");
    try {
      await createWorld(name, description);
    } catch {
      setError(t("worldSetup.createFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      setError(t("settings.backupTooLarge"));
      return;
    }
    setBusy("import");
    setError("");
    try {
      const backup = parseWorkspaceBackup(await file.text());
      const confirmed = await dialog.confirm({
        message: t("worldSetup.importConfirm", {
          world: backup.data.world.name,
          entries: backup.data.entries.length,
          maps: backup.data.atlas.maps.length,
          assets: backup.data.assetLibrary.items.length,
        }),
      });
      if (!confirmed) return;
      await createWorldFromBackup(backup);
    } catch {
      setError(t("settings.invalidBackup"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,color-mix(in_srgb,var(--accent)_12%,transparent),transparent_42%)]" />
      <div className="relative w-full max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <span className="flex items-center gap-3 text-sm font-semibold"><Sparkles size={18} className="text-[var(--accent)]" />World Studio</span>
          <div className="flex items-center gap-2">
            <LanguageMenu compact />
            <motion.button
              type="button"
              whileTap={pressTap}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
              aria-label={theme === "dark" ? t("theme.switchToLight") : t("theme.switchToDark")}
              aria-pressed={theme === "dark"}
            >
              <motion.span initial={false} animate={{ rotate: theme === "dark" ? 180 : 0 }} transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }} className="flex"><ThemeIcon size={17} strokeWidth={1.7} /></motion.span>
            </motion.button>
          </div>
        </header>

        <section className="grid overflow-hidden rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-solid)] shadow-[0_35px_120px_rgba(44,33,20,.16)] lg:h-[34rem] lg:grid-cols-[1.05fr_.95fr]">
          <div className="flex flex-col justify-between border-b border-[var(--border)] p-7 sm:p-10 lg:border-b-0 lg:border-r">
            <div>
              <p className="ws-eyebrow">{t("worldSetup.eyebrow")}</p>
              <h1 className="ws-display mt-4 min-h-[3.75rem] max-w-lg text-4xl font-semibold leading-tight sm:min-h-[7.5rem] sm:text-5xl lg:min-h-[7rem]">{t("worldSetup.title")}</h1>
              <p className="mt-5 min-h-[3.5rem] max-w-xl text-sm leading-7 text-[var(--text-muted)]">{t("worldSetup.description")}</p>
            </div>
            <div className="mt-10 border-t border-[var(--border)] pt-6">
              <blockquote
                className="ws-display line-clamp-2 min-h-16 max-w-xl text-lg leading-8 text-[var(--text)]"
                style={{ viewTransitionName: "daily-quote" }}
              >
                {quote.text}
              </blockquote>
              <p className="mt-2 text-xs leading-5 text-[var(--text-faint)]">{quote.translation}</p>
              <cite className="mt-3 block text-[10px] not-italic uppercase tracking-[.16em] text-[var(--text-faint)]">{quote.source}</cite>
              <div className="mt-6 flex items-start gap-3 text-xs leading-6 text-[var(--text-faint)]"><BookOpen size={17} className="mt-1 shrink-0 text-[var(--accent)]" />{t("worldSetup.localFirst")}</div>
            </div>
          </div>

          <form onSubmit={(event) => void submit(event)} className="p-7 sm:p-10">
            <h2 className="ws-display text-2xl font-semibold">{t("worldSetup.createTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t("worldSetup.createHelp")}</p>
            <label className="mt-7 block text-xs font-semibold text-[var(--text-muted)]">{t("settings.worldName")}<input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder={t("settings.worldNamePlaceholder")} className="ws-input mt-2 h-12 w-full rounded-xl px-4 text-sm" /></label>
            <label className="mt-4 block text-xs font-semibold text-[var(--text-muted)]">{t("settings.worldDescription")}<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("settings.worldDescriptionPlaceholder")} rows={3} className="ws-input mt-2 w-full resize-none rounded-xl px-4 py-3 text-sm leading-6" /></label>
            {error ? <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-600 dark:text-red-300">{error}</p> : null}
            <button type="submit" disabled={!name.trim() || busy !== null} className="ws-button-primary mt-6 h-12 w-full rounded-xl text-sm font-semibold disabled:opacity-40">{busy === "create" ? t("worldSetup.creating") : t("worldSetup.create")}</button>
            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[.18em] text-[var(--text-faint)]"><span className="h-px flex-1 bg-[var(--border)]" />{t("worldSetup.or")}<span className="h-px flex-1 bg-[var(--border)]" /></div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importBackup(event)} />
            <button type="button" disabled={busy !== null} onClick={() => fileRef.current?.click()} className="ws-button-secondary flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-40"><FileUp size={16} />{busy === "import" ? t("settings.importing") : t("worldSetup.import")}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
