import type { PasswordMap, BreachResults } from "../../types";
import { useSecurityDashboard } from "../../hooks/useSecurityDashboard";
import SecurityScoreRing from "./SecurityScoreRing";
import StrengthDistribution from "./StrengthDistribution";
import BreachSummaryCard from "./BreachSummaryCard";
import ActionableInsightRow from "./ActionableInsightRow";
import type { InsightDetail } from "./ActionableInsightRow";

interface SecurityDashboardProps {
  passwords: PasswordMap;
  breachResults: BreachResults | null;
  checking: boolean;
  onCheckBreaches: () => Promise<unknown>;
  onNavigateToVault: () => void;
  onNavigateToItem?: (website: string, index: number) => void;
}

export default function SecurityDashboard({
  passwords,
  breachResults,
  checking,
  onCheckBreaches,
  onNavigateToVault,
  onNavigateToItem,
}: SecurityDashboardProps) {
  const metrics = useSecurityDashboard(passwords, breachResults);

  const actionableItems: {
    id: string;
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
    count: number;
    onAction: () => void;
    details?: InsightDetail[];
  }[] = [];

  if (metrics.breachedCount > 0) {
    actionableItems.push({
      id: "breached",
      severity: "critical",
      title: "Passwords found in data breaches",
      description: "These passwords have been exposed and should be changed immediately",
      count: metrics.breachedCount,
      onAction: onNavigateToVault,
      details: metrics.breachedEntries.map((e) => ({
        label: e.website,
        sublabel: e.username,
        meta: `${e.breachCount.toLocaleString()} breaches`,
        onClick: onNavigateToItem ? () => onNavigateToItem(e.website, e.index) : undefined,
      })),
    });
  }

  if (metrics.weakEntries.length > 0) {
    actionableItems.push({
      id: "weak",
      severity: "warning",
      title: "Weak or very weak passwords",
      description: "Strengthen these passwords to improve your security",
      count: metrics.weakEntries.length,
      onAction: onNavigateToVault,
      details: metrics.weakEntries.map((e) => ({
        label: e.website,
        meta: e.label,
        onClick: onNavigateToItem ? () => onNavigateToItem(e.website, e.index) : undefined,
      })),
    });
  }

  if (metrics.reusedGroups.length > 0) {
    const reusedCount = metrics.reusedGroups.reduce((sum, g) => sum + g.sites.length, 0);
    actionableItems.push({
      id: "reused",
      severity: "warning",
      title: "Reused passwords",
      description: "Using unique passwords for each site reduces risk",
      count: reusedCount,
      onAction: onNavigateToVault,
      details: metrics.reusedGroups.flatMap((g) =>
        g.sites.map((s, i) => ({
          label: s.website,
          sublabel: i === 0 ? `Shared by ${g.sites.length} entries` : undefined,
          meta: i === 0 ? `${g.sites.length}x` : undefined,
          onClick: onNavigateToItem ? () => onNavigateToItem(s.website, s.index) : undefined,
        }))
      ),
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-2xl font-semibold text-text-primary tracking-tight mb-6">
        Security Overview
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-raised border border-border rounded-xl p-6 flex items-center justify-center">
          <SecurityScoreRing score={metrics.overallScore} />
        </div>

        <div className="bg-surface-raised border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
            Breach Status
          </h3>
          <BreachSummaryCard
            breachedCount={metrics.breachedCount}
            safeCount={metrics.safeCount}
            uncheckedCount={metrics.uncheckedCount}
            checking={checking}
            onCheck={onCheckBreaches}
            totalPasswords={metrics.totalPasswords}
          />
        </div>

        <div className="bg-surface-raised border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
            Password Strength
          </h3>
          <StrengthDistribution
            distribution={metrics.strengthDistribution}
            total={metrics.totalPasswords}
          />
        </div>
      </div>

      {actionableItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">
            Actionable Items
          </h2>
          <div className="space-y-2">
            {actionableItems.map((item) => (
              <ActionableInsightRow
                key={item.id}
                severity={item.severity}
                title={item.title}
                description={item.description}
                count={item.count}
                onAction={item.onAction}
                details={item.details}
              />
            ))}
          </div>
        </div>
      )}

      {metrics.totalPasswords === 0 && (
        <div className="text-center py-12">
          <p className="text-text-muted text-sm">
            Add some passwords to your vault to see security insights.
          </p>
        </div>
      )}

      {actionableItems.length === 0 && metrics.totalPasswords > 0 && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-6 text-center">
          <p className="text-sm font-medium text-success">
            Looking good! No immediate security issues found.
          </p>
          <p className="text-xs text-text-muted mt-1">
            Keep your passwords strong and unique to maintain a healthy vault.
          </p>
        </div>
      )}
    </div>
  );
}