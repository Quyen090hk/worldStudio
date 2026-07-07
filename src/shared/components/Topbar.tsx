import { motion } from "motion/react";
import { Plus, Search } from "lucide-react";
import { pressTap } from "../motion/presets";
import { useEntryStore } from "../../features/entries/stores/useEntryStore";

export function Topbar() {
  const openCreateEntry = useEntryStore((state) => state.openCreateEntry);

  return (
    <header className="flex h-20 items-center justify-between border-b border-white/10 bg-black/10 px-8 backdrop-blur-xl">
      <div>
        <div className="text-sm text-stone-400">Workspace</div>
        <h1 className="text-lg font-semibold">The Ashen Archive</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-80 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-stone-400 transition-colors hover:border-white/20">
          <Search size={17} />
          <span>Search entries, places, events...</span>
        </div>

        <motion.button
          type="button"
          onClick={openCreateEntry}
          whileTap={pressTap}
          whileHover={{ y: -1 }}
          className="flex h-11 items-center gap-2 rounded-2xl bg-violet-500 px-4 text-sm font-medium text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400"
        >
          <Plus size={17} />
          New Entry
        </motion.button>
      </div>
    </header>
  );
}