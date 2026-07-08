import { Outlet } from "react-router-dom";

import { EntryDrawer } from "../../features/entries/components/EntryDrawer";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  return (
    <div className="min-h-screen text-[var(--text)]">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />

          <main className="flex-1 overflow-y-auto px-8 py-7">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <EntryDrawer />
    </div>
  );
}