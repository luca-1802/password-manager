import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "./api";
import type { AuthStatus } from "./types";
import { ToastProvider } from "./components/ui/Toast";
import { useReducedMotion } from "./hooks/useReducedMotion";
import LoginPage from "./pages/LoginPage";
import VaultPage from "./pages/VaultPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import GeneratorPage from "./pages/GeneratorPage";
import TrashPage from "./pages/TrashPage";

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

function App() {
  const [authState, setAuthState] = useState<AuthStatus | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReduced = useReducedMotion();

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
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading application">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  const transition = prefersReduced
    ? { duration: 0 }
    : { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const };

  return (
    <ToastProvider>
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
          className="h-full"
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
              path="/dashboard"
              element={
                authState.authenticated ? (
                  <DashboardPage onLogout={onLogout} />
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
            <Route
              path="/generator"
              element={
                authState.authenticated ? (
                  <GeneratorPage onLogout={onLogout} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/trash"
              element={
                authState.authenticated ? (
                  <TrashPage onLogout={onLogout} />
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