import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePasswords } from "../hooks/usePasswords";
import { useBreachCheck } from "../hooks/useBreachCheck";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import { useAutoLockOnHidden } from "../hooks/useAutoLockOnHidden";
import { useVisibilityLock } from "../hooks/useVisibilityLock";
import { useToast } from "../components/ui/Toast";
import AppShell from "../components/layout/AppShell";
import TopNav from "../components/layout/TopNav";
import BottomNav from "../components/layout/BottomNav";
import SecurityDashboard from "../components/dashboard/SecurityDashboard";

interface Props {
  onLogout: () => void;
}

export default function DashboardPage({ onLogout }: Props) {
  const navigate = useNavigate();
  const { passwords, fetchPasswords } = usePasswords();
  const { breachResults, checking, checkBreaches } = useBreachCheck();
  const { toast } = useToast();

  useInactivityTimeout(onLogout);
  const { autoLockOnHidden } = useAutoLockOnHidden();
  useVisibilityLock(onLogout, autoLockOnHidden);

  useEffect(() => { fetchPasswords(); }, [fetchPasswords]);

  const passwordCount = Object.values(passwords).reduce((a, c) => a + c.length, 0);
  useEffect(() => {
    if (passwordCount > 0 && !breachResults && !checking) {
      checkBreaches();
    }
  }, [passwordCount, breachResults, checking, checkBreaches]);

  const handleNavigate = (page: string) => {
    if (page === "vault") navigate("/vault");
    else if (page === "settings") navigate("/settings");
    else if (page === "generator") navigate("/generator");
  };

  const handleCheckBreaches = async () => {
    const res = await checkBreaches();
    if (res?.ok) {
      const d = res.data;
      toast(
        d.total_breached > 0 ? "error" : "success",
        d.total_breached > 0
          ? `${d.total_breached} of ${d.total_checked} passwords found in breaches`
          : `All ${d.total_checked} passwords are safe`
      );
    } else {
      toast("error", "Breach check failed");
    }
    return res;
  };

  return (
    <AppShell
      topNav={
        <TopNav
          activePage="dashboard"
          onNavigate={handleNavigate}
          onLock={onLogout}
          onSearch={() => navigate("/vault")}
        />
      }
      bottomNav={
        <BottomNav
          activePage="dashboard"
          onNavigate={handleNavigate}
        />
      }
    >
      <SecurityDashboard
        passwords={passwords}
        breachResults={breachResults}
        checking={checking}
        onCheckBreaches={handleCheckBreaches}
        onNavigateToVault={() => navigate("/vault")}
        onNavigateToItem={(website, index) =>
          navigate("/vault", { state: { selectItem: { website, index } } })
        }
      />
    </AppShell>
  );
}