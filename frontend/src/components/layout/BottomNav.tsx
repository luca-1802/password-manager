import { KeyRound, LayoutDashboard, Wand2, Settings } from "lucide-react";
import { cn } from "../../lib/utils";

interface BottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: "vault", label: "Vault", icon: KeyRound },
  { id: "dashboard", label: "Security", icon: LayoutDashboard },
  { id: "generator", label: "Generator", icon: Wand2 },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export default function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-xl border-t border-border-subtle z-40 flex items-center justify-around px-2 pb-safe" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full gap-1 transition-all duration-200 rounded-xl my-1",
              isActive
                ? "text-brand-primary bg-brand-primary/10"
                : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
            )}
          >
            <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "scale-110")} aria-hidden="true" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}