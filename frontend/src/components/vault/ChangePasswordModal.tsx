import { useState, type FormEvent } from "react";
import { KeyRound, Check, X } from "lucide-react";
import { apiFetch } from "../../api";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function ChangePasswordModal({
  open,
  onClose,
  onLogout,
}: Props) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasMinLength = newPassword.length >= 12;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && confirm.length > 0 && newPassword === confirm;

  const isValid =
    currentPassword.length > 0 &&
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasDigit &&
    passwordsMatch &&
    newPassword !== currentPassword;

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValid) return;

    setLoading(true);
    const res = await apiFetch("/auth/change-password", {
      method: "POST",
      body: {
        current_password: currentPassword,
        new_password: newPassword,
        confirm,
      },
    });
    setLoading(false);

    if (res?.ok) {
      toast("success", "Password changed successfully. Please log in again.");
      setTimeout(() => {
        handleClose();
        onLogout();
      }, 1500);
    } else {
      setError(
        (res?.data as Record<string, string>)?.error ||
          "Failed to change password"
      );
    }
  };

  const requirement = (met: boolean, label: string) => (
    <li className="flex items-center gap-1.5">
      {met ? (
        <Check className="w-3 h-3 text-success" />
      ) : (
        <X className="w-3 h-3 text-text-muted" />
      )}
      <span className={met ? "text-success" : "text-text-muted"}>{label}</span>
    </li>
  );

  const errorBlock = error && (
    <p className="text-sm text-red-500 bg-red-600/10 border border-red-600/20 rounded-lg px-3 py-2">
      {error}
    </p>
  );

  return (
    <Modal open={open} onClose={handleClose} title="Change master password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 text-text-secondary">
          <KeyRound className="w-5 h-5 shrink-0" />
          <p className="text-sm">
            After changing your master password you will be logged out and need
            to sign in again with the new password.
          </p>
        </div>

        <Input
          type="password"
          label="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
        />

        <div>
          <Input
            type="password"
            label="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          {newPassword.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {requirement(hasMinLength, "12+ characters")}
              {requirement(hasUppercase, "Contains uppercase letter")}
              {requirement(hasLowercase, "Contains lowercase letter")}
              {requirement(hasDigit, "Contains digit")}
            </ul>
          )}
          {newPassword.length > 0 &&
            currentPassword.length > 0 &&
            newPassword === currentPassword && (
              <p className="text-xs text-red-500 mt-1.5">
                New password must differ from current password
              </p>
            )}
        </div>

        <div>
          <Input
            type="password"
            label="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {confirm.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {requirement(passwordsMatch, "Passwords match")}
            </ul>
          )}
        </div>

        {errorBlock}

        <Button
          type="submit"
          loading={loading}
          disabled={!isValid}
          className="w-full"
        >
          Change password
        </Button>
      </form>
    </Modal>
  );
}