import {
  BookOpen,
  Boxes,
  Feather,
  GitBranch,
  LibraryBig,
  Image,
  Map,
  Settings,
  Timer,
} from "lucide-react";

export const workspaceModules = [
  { label: "nav.manuscript", path: "/manuscript", icon: LibraryBig },
  { label: "nav.entries", path: "/entries", icon: BookOpen },
  { label: "nav.map", path: "/map", icon: Map },
  { label: "nav.graph", path: "/graph", icon: GitBranch },
  { label: "nav.timeline", path: "/timeline", icon: Timer },
  { label: "nav.canvas", path: "/canvas", icon: Boxes },
  { label: "nav.assets", path: "/assets", icon: Image },
  { label: "nav.inspiration", path: "/inspiration", icon: Feather },
  { label: "nav.settings", path: "/settings", icon: Settings },
] as const;

export function moduleForPath(pathname: string) {
  if (pathname.startsWith("/entries/")) return workspaceModules[1];
  return (
    workspaceModules.find((item) => pathname.startsWith(item.path)) ??
    workspaceModules[0]
  );
}
