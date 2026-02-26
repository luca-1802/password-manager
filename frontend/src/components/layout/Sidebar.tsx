import { motion } from "framer-motion";
import {
  Lock,
  Search,
  Plus,
  KeyRound,
  LayoutDashboard,
  Wand2,
  Settings,
  Trash2,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { FolderFilter } from "../../types";
import FolderTree from "./FolderTree";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  folders: string[];
  activeFolder: FolderFilter;
  onFolderChange: (filter: FolderFilter) => void;
  onCreateFolder: (name: string) => Promise<unknown>;
  onRenameFolder: (oldName: string, newName: string) => Promise<unknown>;
  onDeleteFolder: (name: string) => Promise<unknown>;
  activePage: "vault" | "dashboard" | "generator" | "settings" | "trash";
  onNavigate: (page: string) => void;
  onLock: () => void;
  onSearch: () => void;
  onAdd: () => void;
}

const navItems = [
  { id: "vault", label: "Vault", icon: KeyRound },
  { id: "dashboard", label: "Security", icon: LayoutDashboard },
  { id: "generator", label: "Generator", icon: Wand2 },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "trash", label: "Trash", icon: Trash2 },
] as const;

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  folders,
  activeFolder,
  onFolderChange,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  activePage,
  onNavigate,
  onLock,
  onSearch,
  onAdd,
}: SidebarProps) {
  const showLabels = !collapsed;
  const showFolders = activePage === "vault";

  return (
    <motion.nav
      animate={{ width: collapsed ? 56 : 240 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "h-full flex flex-col bg-sidebar border-r border-border-subtle flex-shrink-0 overflow-hidden max-md:overflow-y-auto",
        "max-md:!w-full"
      )}
    >
      <div className={cn(
        "flex items-center gap-2.5 px-4 h-14 flex-shrink-0",
        collapsed && "md:justify-center md:px-0"
      )}>
        <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Lock className="w-3.5 h-3.5 text-accent" />
        </div>
        <span className={cn(
          "font-mono text-sm font-semibold text-text-primary tracking-wider",
          collapsed && "md:hidden"
        )}>
          vault
        </span>
      </div>

      <div className={cn(
        "px-3 mb-1 flex gap-1.5 flex-shrink-0",
        collapsed && "md:flex-col md:items-center md:px-1.5",
        "max-md:px-4 max-md:gap-2 max-md:mb-2"
      )}>
        <button
          onClick={onSearch}
          className={cn(
            "flex items-center gap-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors",
            collapsed
              ? "md:p-2 max-md:flex-1 max-md:px-3 max-md:py-3 max-md:text-sm"
              : "flex-1 px-2.5 py-1.5 text-[13px]"
          )}
          title="Search (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0 max-md:w-5 max-md:h-5" />
          {showLabels && (
            <span>Search</span>
          )}
          {!showLabels && (
            <span className="hidden max-md:inline">Search</span>
          )}
        </button>
        <button
          onClick={onAdd}
          className={cn(
            "flex items-center gap-2 rounded-lg text-accent-text hover:text-accent hover:bg-accent-muted transition-colors",
            collapsed
              ? "md:p-2 max-md:px-3 max-md:py-3 max-md:text-sm"
              : "px-2.5 py-1.5 text-[13px]"
          )}
          title="Add entry"
        >
          <Plus className="w-3.5 h-3.5 flex-shrink-0 max-md:w-5 max-md:h-5" />
          {showLabels && <span>Add</span>}
          {!showLabels && <span className="hidden max-md:inline">Add</span>}
        </button>
      </div>

      <div className="px-3 flex-shrink-0 max-md:px-4">
        {showLabels && (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted px-2.5 mb-1.5 max-md:hidden">
            Navigate
          </p>
        )}
        <p className="hidden max-md:block text-[11px] font-semibold uppercase tracking-widest text-text-muted px-3 mb-2">
          Navigate
        </p>

        <div className="space-y-0.5 max-md:space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-lg transition-colors text-[13px] font-medium",
                  "max-md:text-base max-md:gap-3 max-md:px-3 max-md:py-3",
                  collapsed
                    ? "md:justify-center md:p-2"
                    : "px-2.5 py-1.5",
                  isActive
                    ? "bg-gold-glow text-accent-text border-l-2 border-accent"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0 max-md:w-5 max-md:h-5" />
                {showLabels && <span>{item.label}</span>}
                {!showLabels && <span className="hidden max-md:inline">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {showFolders ? (
        <div className={cn(
          "flex-1 overflow-y-auto mt-4 px-3 max-md:px-4"
        )}>
          <FolderTree
            folders={folders}
            activeFolder={activeFolder}
            onSelect={onFolderChange}
            onCreate={onCreateFolder}
            onRename={onRenameFolder}
            onDelete={onDeleteFolder}
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className={cn(
        "flex-shrink-0 border-t border-border-subtle p-3 max-md:p-4",
        collapsed && "md:flex md:flex-col md:items-center md:gap-2"
      )}>
        <div className={cn(
          "flex items-center",
          collapsed ? "md:flex-col md:gap-1 max-md:gap-1" : "gap-1"
        )}>
          <button
            onClick={onLock}
            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-red-600/10 transition-colors max-md:p-3 max-md:text-sm max-md:flex max-md:items-center max-md:gap-2"
            title="Lock vault"
          >
            <Lock className="w-3.5 h-3.5 max-md:w-5 max-md:h-5" />
            <span className="hidden max-md:inline text-base">Lock vault</span>
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors max-md:hidden"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronsLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </motion.nav>
  );
}