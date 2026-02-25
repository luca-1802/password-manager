import type { PasswordMap, BreachResults } from "../../types";
import { useSecurityDashboard } from "../../hooks/useSecurityDashboard";
import SecurityScoreRing from "./SecurityScoreRing";
import StrengthDistribution from "./StrengthDistribution";
import BreachSummaryCard from "./BreachSummaryCard";
import ActionableInsightRow from "./ActionableInsightRow";
import type { InsightDetail } from "./ActionableInsightRow";
import { ShieldCheck } from "lucide-react";
import styles from "../../styles/effects.module.scss";

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
      title: "Compromised Passwords",
      description: "These passwords were found in known data breaches and should be changed immediately.",
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
      title: "Weak Passwords",
      description: "These passwords are easy to guess or crack. Consider generating stronger ones.",
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
      title: "Reused Passwords",
      description: "Using the same password across multiple sites increases your risk if one is breached.",
      count: reusedCount,
      onAction: onNavigateToVault,
      details: metrics.reusedGroups.flatMap((g) =>
        g.sites.map((s, i) => ({
          label: s.website,
          sublabel: i === 0 ? `Shared by ${g.sites.length} accounts` : undefined,
          meta: i === 0 ? `${g.sites.length}x` : undefined,
          onClick: onNavigateToItem ? () => onNavigateToItem(s.website, s.index) : undefined,
        }))
      ),
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">
          Security Dashboard
        </h1>
        <p className="text-text-secondary mt-2 text-lg">
          Monitor and improve the health of your password vault.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
        <div className={`lg:col-span-4 bg-surface/50 backdrop-blur-sm border border-border-subtle rounded-3xl p-8 flex flex-col items-center justify-center shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group ${styles.gradientBorderCard}`}>
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary to-brand-secondary opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
          <h3 className="text-lg font-semibold text-text-primary mb-8 self-start w-full">Overall Score</h3>
          <SecurityScoreRing score={metrics.overallScore} size={200} />
          <p className="text-sm text-text-secondary mt-8 text-center leading-relaxed">
            Your score is based on password strength, reuse frequency, and known data breaches.
          </p>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className={`bg-surface/50 backdrop-blur-sm border border-border-subtle rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 ${styles.gradientBorderCard}`}>
            <h3 className="text-lg font-semibold text-text-primary mb-6">
              Breach Monitoring
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

          <div className={`bg-surface/50 backdrop-blur-sm border border-border-subtle rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 flex-1 ${styles.gradientBorderCard}`}>
            <h3 className="text-lg font-semibold text-text-primary mb-6">
              Password Strength Distribution
            </h3>
            <StrengthDistribution
              distribution={metrics.strengthDistribution}
              total={metrics.totalPasswords}
            />
          </div>
        </div>
      </div>

      {actionableItems.length > 0 && (
        <div className="mb-10" role="region" aria-label="Security issues">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">
              Actionable Insights
            </h2>
            <span className="bg-surface-sunken text-text-secondary text-sm font-medium px-4 py-1.5 rounded-full border border-border-subtle shadow-sm" aria-live="polite">
              {actionableItems.length} Issues Found
            </span>
          </div>
          <div className="space-y-4">
            {actionableItems.map((item) => (
              <ActionableInsightRow
                key={item.id}
                id={item.id}
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
        <div className="bg-surface/30 border border-border-subtle border-dashed rounded-3xl p-16 text-center">
          <div className="w-20 h-20 bg-surface-sunken rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShieldCheck className="w-10 h-10 text-text-muted" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-semibold text-text-primary mb-3">Your vault is empty</h3>
          <p className="text-text-secondary text-base max-w-md mx-auto">
            Add some passwords to your vault to see security insights, breach monitoring, and strength analysis.
          </p>
        </div>
      )}

      {actionableItems.length === 0 && metrics.totalPasswords > 0 && (
        <div className="bg-success/5 border border-success/20 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShieldCheck className="w-10 h-10 text-success" aria-hidden="true" />
          </div>
          <h3 className="text-2xl font-bold text-success mb-3">
            Looking good!
          </h3>
          <p className="text-text-secondary text-lg max-w-md mx-auto">
            No immediate security issues found. Keep your passwords strong and unique to maintain a healthy vault.
          </p>
        </div>
      )}
    </div>
  );
}