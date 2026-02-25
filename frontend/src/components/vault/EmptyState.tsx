import { Plus, Shield, KeyRound, FileText, File } from "lucide-react";

interface Props {
  onAdd: () => void;
}

export default function EmptyState({ onAdd }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 max-w-md mx-auto">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-brand-primary/20 blur-3xl rounded-full" />
        <div className="w-24 h-24 bg-gradient-to-br from-surface to-surface-sunken rounded-3xl border border-border-subtle shadow-xl flex items-center justify-center relative z-10">
          <Shield className="w-12 h-12 text-brand-primary" />
        </div>
        
        <div className="absolute -top-4 -left-4 w-10 h-10 bg-surface rounded-xl border border-border-subtle shadow-lg flex items-center justify-center animate-bounce" style={{ animationDelay: "0s", animationDuration: "3s" }}>
          <KeyRound className="w-5 h-5 text-text-secondary" />
        </div>
        <div className="absolute top-8 -right-6 w-12 h-12 bg-surface rounded-xl border border-border-subtle shadow-lg flex items-center justify-center animate-bounce" style={{ animationDelay: "0.5s", animationDuration: "3.5s" }}>
          <FileText className="w-6 h-6 text-text-secondary" />
        </div>
        <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-surface rounded-xl border border-border-subtle shadow-lg flex items-center justify-center animate-bounce" style={{ animationDelay: "1s", animationDuration: "2.5s" }}>
          <File className="w-4 h-4 text-text-secondary" />
        </div>
      </div>

      <h3 className="text-2xl font-bold text-text-primary mb-3 tracking-tight">
        Your vault is empty
      </h3>
      <p className="text-text-muted mb-8 text-base leading-relaxed">
        Securely store your passwords, notes, and files. Everything is encrypted locally before it leaves your device.
      </p>

      <button
        onClick={onAdd}
        className="group flex items-center gap-2.5 px-6 py-3 bg-brand-primary text-white rounded-full hover:bg-brand-primary/90 transition-all duration-300 font-medium shadow-lg shadow-brand-primary/25 hover:shadow-xl hover:shadow-brand-primary/30 hover:-translate-y-0.5"
      >
        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" />
        Add Your First Item
      </button>
    </div>
  );
}