import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import Button from "../ui/Button";
import { useCountUp } from "../../hooks/useCountUp";

interface BreachSummaryCardProps {
  breachedCount: number;
  safeCount: number;
  uncheckedCount: number;
  checking: boolean;
  onCheck: () => void;
  totalPasswords: number;
}

export default function BreachSummaryCard({
  breachedCount,
  safeCount,
  uncheckedCount,
  checking,
  onCheck,
  totalPasswords,
}: BreachSummaryCardProps) {
  const hasResults = breachedCount + safeCount > 0;
  const animatedBreached = useCountUp(breachedCount, 600);
  const animatedSafe = useCountUp(safeCount, 600);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full transition-all duration-300 ${breachedCount > 0 ? 'bg-danger/10 text-danger shadow-lg shadow-danger/10' : hasResults ? 'bg-success/10 text-success shadow-lg shadow-success/10' : 'bg-surface-hover text-text-muted'}`}>
          {breachedCount > 0 ? (
            <ShieldAlert className="w-6 h-6" aria-hidden="true" />
          ) : hasResults ? (
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          ) : (
            <ShieldQuestion className="w-6 h-6" aria-hidden="true" />
          )}
        </div>
        <div>
          <p className="text-base font-medium text-text-primary">
            {hasResults
              ? breachedCount > 0
                ? <><span className="tabular-nums">{animatedBreached}</span> breached passwords found</>
                : "No breached passwords found"
              : "Breach check not run yet"}
          </p>
          <p className="text-sm text-text-muted mt-0.5">
            {hasResults
              ? <><span className="tabular-nums">{animatedSafe}</span> safe{uncheckedCount > 0 ? ` \u00b7 ${uncheckedCount} unchecked` : ""}</>
              : totalPasswords > 0
                ? "Scan your vault to find compromised passwords"
                : "Add passwords to scan them for breaches"}
          </p>
        </div>
      </div>
      <Button
        variant={breachedCount > 0 ? "danger" : "secondary"}
        onClick={onCheck}
        loading={checking}
        disabled={checking || totalPasswords === 0}
        className="sm:w-auto w-full"
        aria-label={checking ? "Scanning for breaches" : "Scan vault for breaches"}
      >
        {checking ? "Scanning..." : hasResults ? "Scan Again" : "Scan Vault"}
      </Button>
    </div>
  );
}