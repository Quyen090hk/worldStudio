import {
  BookOpen,
  Boxes,
  GitBranch,
  Home,
  Image,
  Map,
  Settings,
  Sparkles,
  Timer,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: Home,
  },
  {
    label: "Entries",
    path: "/entries",
    icon: BookOpen,
  },
  {
    label: "Map",
    path: "/map",
    icon: Map,
  },
  {
    label: "Graph",
    path: "/graph",
    icon: GitBranch,
  },
  {
    label: "Timeline",
    path: "/timeline",
    icon: Timer,
  },
  {
    label: "Canvas",
    path: "/canvas",
    icon: Boxes,
  },
  {
    label: "Assets",
    path: "/assets",
    icon: Image,
  },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-72 flex-col border-r border-white/10 bg-black/20 px-4 py-5 backdrop-blur-xl">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200 ring-1 ring-violet-300/30">
          <Sparkles size={20} />
        </div>

        <div>
          <div className="text-sm text-stone-400">Local World</div>
          <div className="font-semibold tracking-wide">Studio</div>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                  isActive
                    ? "bg-white/10 text-white shadow-lg shadow-black/20"
                    : "text-stone-400 hover:bg-white/5 hover:text-stone-100",
                ].join(" ")
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-2 text-sm font-medium">Current World</div>
        <div className="text-xs leading-5 text-stone-400">
          The Ashen Archive
        </div>
      </div>

      <NavLink
        to="/settings"
        className="mt-3 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-stone-400 transition hover:bg-white/5 hover:text-stone-100"
      >
        <Settings size={18} />
        <span>Settings</span>
      </NavLink>
    </aside>
  );
}