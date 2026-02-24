import type {
  ExtensionMessage,
  Credential,
  PasswordMap,
  VaultResponse,
} from "../types";
import * as api from "../api";

let cachedVault: VaultResponse | null = null;
let lastActivity = Date.now();
const INACTIVITY_MS = 4 * 60 * 1000;

chrome.alarms.create("inactivity-check", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "inactivity-check") {
    if (Date.now() - lastActivity > INACTIVITY_MS) {
      await lockVault();
    }
  }
});

async function lockVault(): Promise<void> {
  cachedVault = null;
  try {
    await api.logout();
  } catch {
    await api.setToken(null);
  }
}

function touchActivity(): void {
  lastActivity = Date.now();
}

function findCredentialsForDomain(
  domain: string,
  passwords: PasswordMap
): { website: string; credentials: Credential[] }[] {
  const results: { website: string; credentials: Credential[] }[] = [];
  const domainLower = domain.toLowerCase();

  for (const [website, entries] of Object.entries(passwords)) {
    const siteLower = website.toLowerCase();
    const domainBase = domainLower.replace(
      /\.(com|org|net|io|dev|co|me|app|xyz|info|biz)$/,
      ""
    );
    if (domainLower.includes(siteLower) || siteLower.includes(domainBase)) {
      results.push({ website, credentials: entries });
    }
  }
  return results;
}

function isDuplicateCredential(
  domain: string,
  username: string,
  password: string,
  passwords: PasswordMap
): boolean {
  const domainLower = domain.toLowerCase();
  for (const [website, entries] of Object.entries(passwords)) {
    const siteLower = website.toLowerCase();
    const domainBase = domainLower.replace(
      /\.(com|org|net|io|dev|co|me|app|xyz|info|biz)$/,
      ""
    );
    if (domainLower.includes(siteLower) || siteLower.includes(domainBase)) {
      for (const entry of entries) {
        if (
          (entry.username || "") === username &&
          entry.password === password
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

async function refreshVault(): Promise<VaultResponse | null> {
  const res = await api.getAllCredentials();
  if (res.ok) {
    cachedVault = res.data;
    return cachedVault;
  }
  if (res.status === 401) await lockVault();
  return null;
}

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
    touchActivity();
    handleMessage(message as ExtensionMessage).then(sendResponse);
    return true;
  }
);

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    case "GET_AUTH_STATUS": {
      const token = await api.getToken();
      if (!token) return { authenticated: false };
      const res = await api.checkStatus();
      return { authenticated: res.ok && res.data.authenticated };
    }

    case "LOGIN": {
      const { masterPassword } = message.payload as {
        masterPassword: string;
      };
      const res = await api.login(masterPassword);
      if (res.ok && res.data.token) {
        await api.setToken(res.data.token);
        await refreshVault();
        return { success: true };
      }
      if (res.ok && res.data.requires_2fa) {
        return {
          requires_2fa: true,
          pending_token: res.data.pending_token,
        };
      }
      return {
        error: res.data.error || "Login failed",
        locked_until: res.data.locked_until,
      };
    }

    case "LOGIN_2FA": {
      const { pendingToken, code } = message.payload as {
        pendingToken: string;
        code: string;
      };
      const res = await api.verify2FA(pendingToken, code);
      if (res.ok && res.data.token) {
        await api.setToken(res.data.token);
        await refreshVault();
        return { success: true };
      }
      return {
        error: res.data.error || "2FA verification failed",
        locked_until: res.data.locked_until,
      };
    }

    case "LOGOUT": {
      await api.logout();
      cachedVault = null;
      return { success: true };
    }

    case "GET_CREDENTIALS": {
      if (!cachedVault) await refreshVault();
      if (!cachedVault) return { error: "Not authenticated", credentials: {} };
      return { credentials: cachedVault.passwords };
    }

    case "GET_CREDENTIALS_FOR_DOMAIN": {
      const { domain } = message.payload as { domain: string };
      if (!cachedVault) await refreshVault();
      if (!cachedVault) return { matches: [] };
      return {
        matches: findCredentialsForDomain(domain, cachedVault.passwords),
      };
    }

    case "SAVE_CREDENTIAL": {
      const payload = message.payload as {
        website: string;
        username: string;
        password: string;
      };
      const res = await api.saveCredential(payload);
      if (res.ok) {
        await refreshVault();
        return { success: true };
      }
      return {
        error:
          (res.data as Record<string, string>)?.error || "Failed to save",
      };
    }

    case "FILL_CREDENTIAL": {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]?.id) {
        await chrome.tabs.sendMessage(tabs[0].id, message);
      }
      return { success: true };
    }

    case "FORM_SUBMITTED": {
      const { domain, username, password } = message.payload as {
        domain: string;
        username: string;
        password: string;
      };

      if (!cachedVault)
        await refreshVault();

      if (cachedVault) {
        const dominated = isDuplicateCredential(
          domain,
          username,
          password,
          cachedVault.passwords
        );
        if (dominated) return { success: true, duplicate: true };
      }

      await chrome.storage.session.set({
        pendingSave: {
          domain,
          username,
          password,
          timestamp: Date.now(),
        },
      });
      await chrome.action.setBadgeText({ text: "+" });
      await chrome.action.setBadgeBackgroundColor({ color: "#d4a843" });
      return { success: true };
    }

    case "GET_PENDING_SAVE": {
      const { domain } = message.payload as { domain: string };
      const result = await chrome.storage.session.get("pendingSave");
      const pending = result.pendingSave as
        | { domain: string; username: string; password: string; timestamp: number }
        | undefined;

      if (!pending) return { pending: null };

      if (Date.now() - pending.timestamp > 5 * 60 * 1000) {
        await chrome.storage.session.remove("pendingSave");
        await chrome.action.setBadgeText({ text: "" });
        return { pending: null };
      }

      if (domain !== pending.domain) return { pending: null };

      return { pending: { domain: pending.domain, username: pending.username, password: pending.password } };
    }

    case "DISMISS_PENDING_SAVE": {
      await chrome.storage.session.remove("pendingSave");
      await chrome.action.setBadgeText({ text: "" });
      return { success: true };
    }

    case "LOCK_VAULT": {
      await lockVault();
      return { success: true };
    }

    default:
      return { error: "Unknown message type" };
  }
}