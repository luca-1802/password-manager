import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { apiFetch } from "./api";
import type { AuthStatus } from "./types";
import { ToastProvider } from "./components/ui/Toast";
import LoginPage from "./pages/LoginPage";
import VaultPage from "./pages/VaultPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  const [authState, setAuthState] = useState<AuthStatus | null>(null);
  const navigate = useNavigate();

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <Routes>
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
    </ToastProvider>
  );
}

export default App;