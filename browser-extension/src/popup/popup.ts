import type { Credential } from "../types";

interface CredentialMatch {
  website: string;
  credentials: Credential[];
}

interface PendingSave {
  domain: string;
  username: string;
  password: string;
  timestamp: number;
}

const $loading = document.getElementById("loading")!;
const $screenLogin = document.getElementById("screen-login")!;
const $screen2FA = document.getElementById("screen-2fa")!;
const $screenCredentials = document.getElementById("screen-credentials")!;
const $screenSave = document.getElementById("screen-save")!;

const $loginForm = document.getElementById("login-form") as HTMLFormElement;
const $masterPassword = document.getElementById("master-password") as HTMLInputElement;
const $loginError = document.getElementById("login-error")!;
const $loginBtn = document.getElementById("login-btn") as HTMLButtonElement;
const $statusDot = document.getElementById("status-dot")!;
const $statusText = document.getElementById("status-text")!;

const $twofaForm = document.getElementById("twofa-form") as HTMLFormElement;
const $twofaCode = document.getElementById("twofa-code") as HTMLInputElement;
const $twofaError = document.getElementById("twofa-error")!;
const $twofaBtn = document.getElementById("twofa-btn") as HTMLButtonElement;
const $twofaBack = document.getElementById("twofa-back")!;

const $lockBtn = document.getElementById("lock-btn")!;
const $searchInput = document.getElementById("search-input") as HTMLInputElement;
const $credentialsList = document.getElementById("credentials-list")!;
const $credentialsEmpty = document.getElementById("credentials-empty")!;

const $saveDomain = document.getElementById("save-domain")!;
const $saveUsername = document.getElementById("save-username")!;
const $savePasswordPreview = document.getElementById("save-password-preview")!;
const $saveError = document.getElementById("save-error")!;
const $saveDuplicate = document.getElementById("save-duplicate")!;
const $saveConfirm = document.getElementById("save-confirm") as HTMLButtonElement;
const $saveDismiss = document.getElementById("save-dismiss")!;

const PAGE_SIZE = 6;

let pendingToken = "";
let currentTabDomain = "";
let allCredentials: Record<string, Credential[]> = {};
let pendingSaveData: PendingSave | null = null;
let currentPage = 0;

function showScreen(screen: HTMLElement): void {
  [$loading, $screenLogin, $screen2FA, $screenCredentials, $screenSave].forEach(
    (s) => s.classList.add("hidden")
  );
  screen.classList.remove("hidden");
}

function showError(el: HTMLElement, message: string): void {
  el.textContent = message;
  el.classList.remove("hidden");
}

function hideError(el: HTMLElement): void {
  el.classList.add("hidden");
}

async function sendMessage(type: string, payload?: unknown): Promise<Record<string, unknown>> {
  return (await chrome.runtime.sendMessage({ type, payload })) as Record<string, unknown>;
}

async function checkConnection(): Promise<boolean> {
  try {
    const res = await sendMessage("GET_AUTH_STATUS");
    if (res.authenticated) {
      $statusDot.className = "status-dot connected";
      $statusText.textContent = "Connected";
      return true;
    }
    if (res.serverOnline) {
      $statusDot.className = "status-dot connected";
      $statusText.textContent = "Server online";
    } else {
      $statusDot.className = "status-dot disconnected";
      $statusText.textContent = "Disconnected";
    }
    return false;
  } catch {
    $statusDot.className = "status-dot disconnected";
    $statusText.textContent = "Disconnected";
    return false;
  }
}

async function getCurrentTabDomain(): Promise<string> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.url) {
      return new URL(tabs[0].url).hostname.replace(/^www\./, "");
    }
  } catch {}
  return "";
}

$loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError($loginError);
  $loginBtn.disabled = true;
  $loginBtn.textContent = "Unlocking...";

  const password = $masterPassword.value;
  if (!password) {
    showError($loginError, "Please enter your master password");
    $loginBtn.disabled = false;
    $loginBtn.textContent = "Unlock Vault";
    return;
  }

  const res = await sendMessage("LOGIN", { masterPassword: password });
  $masterPassword.value = "";

  if (res.success) {
    await loadCredentials();
    return;
  }

  if (res.requires_2fa) {
    pendingToken = res.pending_token as string;
    showScreen($screen2FA);
    $twofaCode.focus();
    $loginBtn.disabled = false;
    $loginBtn.textContent = "Unlock Vault";
    return;
  }

  let errorMsg = (res.error as string) || "Login failed";
  if (res.locked_until) {
    const seconds = Math.ceil(res.locked_until as number);
    errorMsg = `Vault locked. Try again in ${seconds}s`;
  }
  showError($loginError, errorMsg);
  $loginBtn.disabled = false;
  $loginBtn.textContent = "Unlock Vault";
});

$twofaForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError($twofaError);
  $twofaBtn.disabled = true;
  $twofaBtn.textContent = "Verifying...";

  const code = $twofaCode.value.trim();
  if (!code) {
    showError($twofaError, "Please enter your authentication code");
    $twofaBtn.disabled = false;
    $twofaBtn.textContent = "Verify";
    return;
  }

  const res = await sendMessage("LOGIN_2FA", { pendingToken, code });
  $twofaCode.value = "";

  if (res.success) {
    pendingToken = "";
    await loadCredentials();
    return;
  }

  let twofaErrorMsg = (res.error as string) || "Verification failed";
  if (res.locked_until) {
    const seconds = Math.ceil(res.locked_until as number);
    twofaErrorMsg = `Too many failed attempts. Try again in ${seconds}s`;
  }
  showError($twofaError, twofaErrorMsg);
  $twofaBtn.disabled = false;
  $twofaBtn.textContent = "Verify";
});

$twofaBack.addEventListener("click", () => {
  pendingToken = "";
  hideError($twofaError);
  showScreen($screenLogin);
  $masterPassword.focus();
});

$lockBtn.addEventListener("click", async () => {
  await sendMessage("LOGOUT");
  allCredentials = {};
  showScreen($screenLogin);
  $masterPassword.focus();
});

async function loadCredentials(): Promise<void> {
  showScreen($screenCredentials);
  const res = await sendMessage("GET_CREDENTIALS");

  if (res.error) {
    showScreen($screenLogin);
    return;
  }

  allCredentials = (res.credentials as Record<string, Credential[]>) || {};
  renderCredentials();
}

function renderCredentials(filter = ""): void {
  $credentialsList.innerHTML = "";
  const filterLower = filter.toLowerCase();

  const domainMatches: { website: string; cred: Credential }[] = [];
  const otherEntries: { website: string; cred: Credential }[] = [];

  for (const [website, entries] of Object.entries(allCredentials)) {
    for (const cred of entries) {
      if (filterLower) {
        const matchText = `${website} ${cred.username}`.toLowerCase();
        if (!matchText.includes(filterLower)) continue;
      }

      const siteLower = website.toLowerCase();
      const domainBase = currentTabDomain
        .toLowerCase()
        .replace(/\.(com|org|net|io|dev|co|me|app|xyz|info|biz)$/, "");

      if (
        currentTabDomain &&
        (currentTabDomain.toLowerCase().includes(siteLower) ||
          siteLower.includes(domainBase))
      ) {
        domainMatches.push({ website, cred });
      } else {
        otherEntries.push({ website, cred });
      }
    }
  }

  const allItems = [...domainMatches, ...otherEntries];
  const totalCount = allItems.length;

  if (totalCount === 0) {
    $credentialsEmpty.classList.remove("hidden");
    return;
  }
  $credentialsEmpty.classList.add("hidden");

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  if (currentPage >= totalPages) currentPage = totalPages - 1;
  if (currentPage < 0) currentPage = 0;
  const start = currentPage * PAGE_SIZE;
  const pageItems = allItems.slice(start, start + PAGE_SIZE);

  const domainMatchCount = domainMatches.length;

  let addedDomainHeader = false;
  let addedOtherHeader = false;

  for (let i = 0; i < pageItems.length; i++) {
    const globalIndex = start + i;
    const { website, cred } = pageItems[i];
    const isDomainMatch = globalIndex < domainMatchCount;

    if (isDomainMatch && !addedDomainHeader) {
      addedDomainHeader = true;
      const header = document.createElement("div");
      header.className = "cred-group-header";
      header.textContent = `Matches for ${currentTabDomain}`;
      $credentialsList.appendChild(header);
    }

    if (!isDomainMatch && !addedOtherHeader) {
      addedOtherHeader = true;
      if (domainMatchCount > 0) {
        const header = document.createElement("div");
        header.className = "cred-group-header";
        header.textContent = "All Credentials";
        $credentialsList.appendChild(header);
      }
    }

    $credentialsList.appendChild(createCredItem(website, cred, isDomainMatch));
  }

  if (totalPages > 1) {
    const pager = document.createElement("div");
    pager.className = "pagination";

    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "\u2039";
    prevBtn.disabled = currentPage === 0;
    prevBtn.addEventListener("click", () => {
      currentPage--;
      renderCredentials(filter);
    });

    const pageInfo = document.createElement("span");
    pageInfo.className = "pagination-info";
    pageInfo.textContent = `${currentPage + 1} / ${totalPages}`;

    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = "\u203A";
    nextBtn.disabled = currentPage >= totalPages - 1;
    nextBtn.addEventListener("click", () => {
      currentPage++;
      renderCredentials(filter);
    });

    pager.appendChild(prevBtn);
    pager.appendChild(pageInfo);
    pager.appendChild(nextBtn);
    $credentialsList.appendChild(pager);
  }
}

function createCredItem(
  website: string,
  cred: Credential,
  isDomainMatch: boolean
): HTMLElement {
  const item = document.createElement("div");
  item.className = `cred-item${isDomainMatch ? " domain-match" : ""}`;

  const info = document.createElement("div");
  info.className = "cred-item-info";

  const user = document.createElement("div");
  user.className = "cred-item-user";
  user.textContent = cred.username;

  const site = document.createElement("div");
  site.className = "cred-item-site";
  site.textContent = website;

  info.appendChild(user);
  info.appendChild(site);

  const fill = document.createElement("span");
  fill.className = "cred-item-fill";
  fill.textContent = "Fill";

  item.appendChild(info);
  item.appendChild(fill);

  item.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "FILL_CREDENTIAL",
      payload: { username: cred.username, password: cred.password },
    });
    window.close();
  });

  return item;
}

$searchInput.addEventListener("input", () => {
  currentPage = 0;
  renderCredentials($searchInput.value);
});

async function checkPendingSave(): Promise<boolean> {
  const result = await chrome.storage.session.get("pendingSave");
  const pending = result.pendingSave as PendingSave | undefined;

  if (!pending) return false;

  if (Date.now() - pending.timestamp > 5 * 60 * 1000) {
    await chrome.storage.session.remove("pendingSave");
    await chrome.action.setBadgeText({ text: "" });
    return false;
  }

  pendingSaveData = pending;
  return true;
}

function checkDuplicateInVault(domain: string, username: string, password: string): boolean {
  const domainLower = domain.toLowerCase();
  for (const [website, entries] of Object.entries(allCredentials)) {
    const siteLower = website.toLowerCase();
    const domainBase = domainLower.replace(
      /\.(com|org|net|io|dev|co|me|app|xyz|info|biz)$/,
      ""
    );
    if (domainLower.includes(siteLower) || siteLower.includes(domainBase)) {
      for (const cred of entries) {
        if ((cred.username || "") === username && cred.password === password) {
          return true;
        }
      }
    }
  }
  return false;
}

function showSavePrompt(): void {
  if (!pendingSaveData) return;
  $saveDomain.textContent = pendingSaveData.domain;
  $saveUsername.textContent = pendingSaveData.username || "(none)";
  $savePasswordPreview.textContent = "\u2022".repeat(
    Math.min(pendingSaveData.password.length, 12)
  );
  hideError($saveError);

  const isDuplicate = checkDuplicateInVault(
    pendingSaveData.domain,
    pendingSaveData.username,
    pendingSaveData.password
  );
  if (isDuplicate) {
    $saveDuplicate.classList.remove("hidden");
    $saveConfirm.disabled = true;
    $saveConfirm.textContent = "Already Saved";
  } else {
    $saveDuplicate.classList.add("hidden");
    $saveConfirm.disabled = false;
    $saveConfirm.textContent = "Save to Vault";
  }

  showScreen($screenSave);
}

$saveConfirm.addEventListener("click", async () => {
  if (!pendingSaveData) return;
  $saveConfirm.disabled = true;
  $saveConfirm.textContent = "Saving...";
  hideError($saveError);

  const res = await sendMessage("SAVE_CREDENTIAL", {
    website: pendingSaveData.domain,
    username: pendingSaveData.username,
    password: pendingSaveData.password,
  });

  if (res.success) {
    await chrome.storage.session.remove("pendingSave");
    await chrome.action.setBadgeText({ text: "" });
    pendingSaveData = null;
    await loadCredentials();
    return;
  }

  showError($saveError, (res.error as string) || "Failed to save");
  $saveConfirm.disabled = false;
  $saveConfirm.textContent = "Save to Vault";
});

$saveDismiss.addEventListener("click", async () => {
  await chrome.storage.session.remove("pendingSave");
  await chrome.action.setBadgeText({ text: "" });
  pendingSaveData = null;
  await loadCredentials();
});

async function init(): Promise<void> {
  showScreen($loading);

  currentTabDomain = await getCurrentTabDomain();
  const isAuthenticated = await checkConnection();

  if (isAuthenticated) {
    const credRes = await sendMessage("GET_CREDENTIALS");
    if (credRes.credentials) {
      allCredentials = credRes.credentials as Record<string, Credential[]>;
    }

    const hasPending = await checkPendingSave();
    if (hasPending) {
      showSavePrompt();
      return;
    }
    showScreen($screenCredentials);
    renderCredentials();
    $searchInput.focus();
  } else {
    showScreen($screenLogin);
    $masterPassword.focus();
  }
}

init();

setInterval(checkConnection, 15000);