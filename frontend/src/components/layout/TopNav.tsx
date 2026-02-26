import { Lock, Shield, KeyRound, LayoutDashboard, Wand2, Settings, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface TopNavProps {
  activePage: "vault" | "dashboard" | "generator" | "settings" | "trash";
  onNavigate: (page: string) => void;
  onLock: () => void;
  onSearch: () => void;
}

const navItems = [
  { id: "vault", label: "Vault", icon: KeyRound },
  { id: "dashboard", label: "Security", icon: LayoutDashboard },
  { id: "generator", label: "Generator", icon: Wand2 },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "trash", label: "Trash", icon: Trash2 },
] as const;

export default function TopNav({
  activePage,
  onNavigate,
  onLock,
}: TopNavProps) {
  return (
    <header className="h-16 border-b border-border-subtle bg-surface/80 backdrop-blur-2xl sticky top-0 z-40 grid grid-cols-[auto_1fr_auto] items-center px-4 sm:px-8 shadow-sm transition-all duration-300">
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => onNavigate("vault")}
        role="button"
        tabIndex={0}
        aria-label="Go to vault"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigate("vault"); } }}
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg group-hover:shadow-brand-primary/20 group-hover:scale-105 transition-all duration-300">
          <Shield className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <span className="font-bold text-xl tracking-tight text-text-primary group-hover:text-brand-primary transition-colors duration-300 hidden sm:inline">
          Vault
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-2 justify-self-center" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                isActive
                  ? "bg-surface-raised text-brand-primary shadow-md border border-border-subtle scale-105"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover hover:scale-105"
              )}
            >
              <Icon className={cn("w-4 h-4 transition-transform duration-300", isActive ? "text-brand-primary scale-110" : "text-text-muted group-hover:scale-110")} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 sm:gap-4 justify-self-end">
        <button
          onClick={onLock}
          aria-label="Lock vault"
          className="p-2.5 rounded-2xl text-text-secondary hover:text-danger hover:bg-danger/10 hover:scale-105 transition-all duration-300"
        >
          <Lock className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}