import { ShieldCheck, ShieldAlert } from "lucide-react";
import Button from "../ui/Button";

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

  return (
    <div className="space-y-3">
      {hasResults ? (
        <>
          <div className="flex items-center gap-3">
            {breachedCount > 0 ? (
              <ShieldAlert className="w-5 h-5 text-danger" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-success" />
            )}
            <div>
              <p className="text-sm font-medium text-text-primary">
                {breachedCount > 0
                  ? `${breachedCount} breached`
                  : "All clear"}
              </p>
              <p className="text-xs text-text-muted">
                {safeCount} safe{uncheckedCount > 0 ? ` \u00b7 ${uncheckedCount} unchecked` : ""}
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-text-muted">
          {totalPasswords > 0
            ? "Run a breach check to scan your passwords"
            : "No passwords to check"}
        </p>
      )}
      <Button
        variant="secondary"
        size="sm"
        onClick={onCheck}
        loading={checking}
        disabled={checking || totalPasswords === 0}
      >
        {checking ? "Checking..." : hasResults ? "Re-check" : "Check Now"}
      </Button>
    </div>
  );
}