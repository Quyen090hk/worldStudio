import { AnimatePresence, motion } from "motion/react";
import { Archive, BookOpen, ChevronRight, Download, FileText, FolderArchive, Upload, X } from "lucide-react";
import { useState } from "react";

import { useI18n } from "../../../shared/i18n";
import { pressTap } from "../../../shared/motion/presets";

type TransferMode = "import" | "export" | null;

function trigger(id: string) {
  document.getElementById(id)?.click();
}

export function DataTransferCenter() {
  const { t } = useI18n();
  const [mode, setMode] = useState<TransferMode>(null);

  const actions = mode === "import" ? [
    { id: "ws-import-content", icon: FileText, title: t("transfer.importContent"), detail: t("transfer.importContentHint") },
    { id: "ws-import-current-world", icon: BookOpen, title: t("transfer.importWorld"), detail: t("transfer.importWorldHint") },
    { id: "ws-import-all-worlds", icon: FolderArchive, title: t("transfer.importWorlds"), detail: t("transfer.importWorldsHint") },
  ] : [
    { id: "ws-export-current-world", icon: BookOpen, title: t("transfer.exportWorld"), detail: t("transfer.exportWorldHint") },
    { id: "ws-export-all-worlds", icon: Archive, title: t("transfer.exportWorlds"), detail: t("transfer.exportWorldsHint") },
  ];

  return (
    <section className="ws-compact-surface ws-panel-padding">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="ws-eyebrow">{t("transfer.eyebrow")}</p><h2 className="ws-display mt-1 text-2xl font-semibold">{t("transfer.title")}</h2><p className="mt-1 text-xs leading-5 text-[var(--text-faint)]">{t("transfer.description")}</p></div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <motion.button type="button" whileTap={pressTap} onClick={() => setMode((value) => value === "import" ? null : "import")} aria-expanded={mode === "import"} className={`flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold ${mode === "import" ? "ws-button-primary" : "ws-button-secondary"}`}><Upload size={16} />{t("transfer.import")}</motion.button>
          <motion.button type="button" whileTap={pressTap} onClick={() => setMode((value) => value === "export" ? null : "export")} aria-expanded={mode === "export"} className={`flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold ${mode === "export" ? "ws-button-primary" : "ws-button-secondary"}`}><Download size={16} />{t("transfer.export")}</motion.button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {mode ? <motion.div key={mode} initial={{ opacity: 0, height: 0, y: -6 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -4 }} transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold text-[var(--text-muted)]">{mode === "import" ? t("transfer.chooseImport") : t("transfer.chooseExport")}</p><button type="button" onClick={() => setMode(null)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]" aria-label={t("common.close")}><X size={14} /></button></div>
            <div className={`grid gap-2 ${actions.length === 3 ? "lg:grid-cols-3" : "sm:grid-cols-2"}`}>{actions.map((action) => { const Icon = action.icon; return <button key={action.id} type="button" onClick={() => { trigger(action.id); setMode(null); }} className="group flex min-h-20 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-solid)] text-[var(--accent)]"><Icon size={16} /></span><span className="min-w-0 flex-1"><b className="block text-sm">{action.title}</b><small className="mt-1 block text-xs leading-5 text-[var(--text-faint)]">{action.detail}</small></span><ChevronRight size={15} className="shrink-0 text-[var(--text-faint)] transition-transform group-hover:translate-x-0.5" /></button>; })}</div>
          </div>
        </motion.div> : null}
      </AnimatePresence>
    </section>
  );
}
