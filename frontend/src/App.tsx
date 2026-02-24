import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";
import { apiFetch } from "./api";
import type { AuthStatus } from "./types";
import { ToastProvider } from "./components/ui/Toast";
import LoginPage from "./pages/LoginPage";
import VaultPage from "./pages/VaultPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  const [authState, setAuthState] = useState<AuthStatus | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const res = await apiFetch<AuthStatus>("/auth/status");
      if (res?.data) {
        setAuthState(res.data);
      } else {
        setAuthState({ authenticated: false, is_new_vault: true, pending_2fa: false, totp_enabled: false });
      }
    };
    checkAuth();
  }, []);

  const onLogin = () => {
    setAuthState({ authenticated: true, is_new_vault: false, pending_2fa: false, totp_enabled: false });
    navigate("/vault");
  };

  const onLogout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    setAuthState({ authenticated: false, is_new_vault: false, pending_2fa: false, totp_enabled: false });
    navigate("/");
  };

  if (!authState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Lock className="w-8 h-8 text-zinc-600" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-zinc-600 font-mono tracking-wider"
        >
          vault
        </motion.div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Routes location={location}>
            <Route
              path="/"
              element={
                authState.authenticated ? (
                  <Navigate to="/vault" />
                ) : (
                  <LoginPage
                    isNewVault={authState.is_new_vault}
                    pendingTwoFa={authState.pending_2fa}
                    onLogin={onLogin}
                  />
                )
              }
            />
            <Route
              path="/vault"
              element={
                authState.authenticated ? (
                  <VaultPage onLogout={onLogout} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/settings"
              element={
                authState.authenticated ? (
                  <SettingsPage onLogout={onLogout} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </ToastProvider>
  );
}

export default App;
