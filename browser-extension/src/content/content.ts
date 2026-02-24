import type { Credential } from "../types";

const PROCESSED_ATTR = "data-pv-processed";
const ICON_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#d4a843" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.13 9 11.25C17.25 22.13 21 17.25 21 12V7l-9-5z"/><circle cx="12" cy="12" r="2.5"/><path d="M12 14.5V18"/><path d="M10.5 16h3"/></svg>`
)}`;

interface MatchResult {
  website: string;
  credentials: Credential[];
}

let currentDropdown: HTMLElement | null = null;
let currentSaveBanner: HTMLElement | null = null;
let currentDomain = "";
let activePasswordField: HTMLInputElement | null = null;
let lastCapturedUsername = "";
let lastCapturedPassword = "";
let saveBannerShownThisPage = false;

function getDomain(): string {
  try {
    return window.location.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function findPasswordFields(): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[type="password"]:not([${PROCESSED_ATTR}])`
    )
  );
}

function findUsernameField(
  passwordField: HTMLInputElement
): HTMLInputElement | null {
  const form = passwordField.closest("form");
  const container = form || passwordField.parentElement?.parentElement;
  if (!container) return null;

  const inputs = Array.from(
    container.querySelectorAll<HTMLInputElement>(
      'input[type="text"], input[type="email"], input:not([type])'
    )
  );

  let candidate: HTMLInputElement | null = null;
  for (const input of inputs) {
    if (
      input.compareDocumentPosition(passwordField) &
      Node.DOCUMENT_POSITION_FOLLOWING
    ) {
      candidate = input;
    }
  }
  return candidate;
}

function setNativeValue(el: HTMLInputElement, value: string): void {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function fillCredential(
  username: string,
  password: string,
  passwordField: HTMLInputElement
): void {
  const usernameField = findUsernameField(passwordField);
  if (usernameField) {
    setNativeValue(usernameField, username);
  }
  setNativeValue(passwordField, password);
  closeDropdown();
}

function closeDropdown(): void {
  if (currentDropdown) {
    currentDropdown.remove();
    currentDropdown = null;
  }
  activePasswordField = null;
}

function createDropdown(
  matches: MatchResult[],
  positionAnchor: HTMLInputElement,
  passwordField: HTMLInputElement
): void {
  closeDropdown();

  const dropdown = document.createElement("div");
  dropdown.className = "pv-dropdown";

  const rect = positionAnchor.getBoundingClientRect();
  dropdown.style.position = "fixed";
  dropdown.style.top = `${rect.bottom + 4}px`;
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.width = `${rect.width}px`;

  if (matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "pv-dropdown-empty";
    empty.textContent = "No saved credentials for this site";
    dropdown.appendChild(empty);
  } else {
    for (const match of matches) {
      const header = document.createElement("div");
      header.className = "pv-dropdown-header";
      header.textContent = match.website;
      dropdown.appendChild(header);

      for (const cred of match.credentials) {
        const item = document.createElement("div");
        item.className = "pv-dropdown-item";

        const user = document.createElement("span");
        user.className = "pv-dropdown-user";
        user.textContent = cred.username || "No username";
        if (!cred.username) user.style.opacity = "0.5";

        const hint = document.createElement("span");
        hint.className = "pv-dropdown-hint";
        hint.textContent = "Click to fill";

        item.appendChild(user);
        item.appendChild(hint);
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          fillCredential(cred.username, cred.password, passwordField);
        });
        dropdown.appendChild(item);
      }
    }
  }

  document.body.appendChild(dropdown);
  currentDropdown = dropdown;
  activePasswordField = passwordField;
}

async function showCredentials(passwordField: HTMLInputElement, positionAnchor: HTMLInputElement): Promise<void> {
  if (!currentDomain) currentDomain = getDomain();

  try {
    const response = (await chrome.runtime.sendMessage({
      type: "GET_CREDENTIALS_FOR_DOMAIN",
      payload: { domain: currentDomain },
    })) as { matches?: MatchResult[] };

    const matches = response?.matches || [];
    if (matches.length > 0) {
      createDropdown(matches, positionAnchor, passwordField);
    }
  } catch {
    closeDropdown();
  }
}

function processPasswordField(passwordField: HTMLInputElement): void {
  passwordField.setAttribute(PROCESSED_ATTR, "true");

  passwordField.addEventListener("focus", () => {
    showCredentials(passwordField, passwordField);
  });

  passwordField.addEventListener("blur", () => {
    setTimeout(() => {
      if (
        currentDropdown &&
        document.activeElement !== passwordField &&
        !currentDropdown.contains(document.activeElement)
      ) {
        closeDropdown();
      }
    }, 200);
  });

  const usernameField = findUsernameField(passwordField);
  if (usernameField && !usernameField.hasAttribute(PROCESSED_ATTR)) {
    usernameField.setAttribute(PROCESSED_ATTR, "true");
    usernameField.addEventListener("focus", () => {
      showCredentials(passwordField, usernameField);
    });
    usernameField.addEventListener("blur", () => {
      setTimeout(() => {
        if (
          currentDropdown &&
          document.activeElement !== usernameField &&
          !currentDropdown.contains(document.activeElement)
        ) {
          closeDropdown();
        }
      }, 200);
    });
  }
}

function scanForFields(): void {
  const passwordFields = findPasswordFields();
  for (const field of passwordFields) {
    processPasswordField(field);
  }
}

function closeSaveBanner(): void {
  if (currentSaveBanner) {
    currentSaveBanner.classList.add("pv-banner-hiding");
    setTimeout(() => {
      currentSaveBanner?.remove();
      currentSaveBanner = null;
    }, 200);
  }
}

function showSaveBanner(domain: string, username: string, password: string): void {
  closeSaveBanner();
  saveBannerShownThisPage = true;

  const banner = document.createElement("div");
  banner.className = "pv-save-banner";

  const icon = document.createElement("div");
  icon.className = "pv-save-banner-icon";
  icon.style.backgroundImage = `url('${ICON_SVG}')`;

  const text = document.createElement("div");
  text.className = "pv-save-banner-text";

  const title = document.createElement("div");
  title.className = "pv-save-banner-title";
  title.textContent = "Save to Password Vault?";

  const detail = document.createElement("div");
  detail.className = "pv-save-banner-detail";
  detail.textContent = `${username} on ${domain}`;

  text.appendChild(title);
  text.appendChild(detail);

  const actions = document.createElement("div");
  actions.className = "pv-save-banner-actions";

  const saveBtn = document.createElement("button");
  saveBtn.className = "pv-save-btn-primary";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", async () => {
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;
    try {
      const res = (await chrome.runtime.sendMessage({
        type: "SAVE_CREDENTIAL",
        payload: { website: domain, username, password },
      })) as { success?: boolean; error?: string };

      if (res?.success) {
        saveBtn.textContent = "Saved!";
        setTimeout(closeSaveBanner, 1000);
      } else {
        saveBtn.textContent = "Failed";
        setTimeout(() => {
          saveBtn.textContent = "Save";
          saveBtn.disabled = false;
        }, 2000);
      }
    } catch {
      saveBtn.textContent = "Save";
      saveBtn.disabled = false;
    }
  });

  const dismissBtn = document.createElement("button");
  dismissBtn.className = "pv-save-btn-secondary";
  dismissBtn.textContent = "Dismiss";
  dismissBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "DISMISS_PENDING_SAVE" });
    closeSaveBanner();
  });

  actions.appendChild(saveBtn);
  actions.appendChild(dismissBtn);

  banner.appendChild(icon);
  banner.appendChild(text);
  banner.appendChild(actions);

  document.body.appendChild(banner);
  currentSaveBanner = banner;

  setTimeout(closeSaveBanner, 30000);
}

function captureCredentials(): { username: string; password: string } | null {
  const passwordFields = document.querySelectorAll<HTMLInputElement>(
    'input[type="password"]'
  );

  for (const pwField of passwordFields) {
    if (!pwField.value) continue;

    const usernameField = findUsernameField(pwField);
    const username = usernameField?.value || "";
    return { username, password: pwField.value };
  }
  return null;
}

function handleCredentialCapture(): void {
  const creds = captureCredentials();
  if (!creds) return;

  if (
    creds.username === lastCapturedUsername &&
    creds.password === lastCapturedPassword
  ) {
    return;
  }
  lastCapturedUsername = creds.username;
  lastCapturedPassword = creds.password;

  const domain = getDomain();

  chrome.runtime
    .sendMessage({
      type: "FORM_SUBMITTED",
      payload: { domain, username: creds.username, password: creds.password },
    })
    .then((res) => {
      const response = res as { duplicate?: boolean } | undefined;
      if (response?.duplicate) return;
      showSaveBanner(domain, creds.username, creds.password);
    })
    .catch(() => {
      showSaveBanner(domain, creds.username, creds.password);
    });
}

function detectFormSubmission(): void {
  document.addEventListener(
    "submit",
    () => {
      handleCredentialCapture();
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest(
        'button[type="submit"], input[type="submit"], button:not([type])'
      ) as HTMLElement | null;

      if (!button) return;

      const form = button.closest("form");
      if (form && form.querySelector('input[type="password"]')) {
        setTimeout(handleCredentialCapture, 100);
        return;
      }

      if (!form && document.querySelector('input[type="password"]')) {
        setTimeout(handleCredentialCapture, 100);
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement &&
        target.type === "password" &&
        target.value
      ) {
        setTimeout(handleCredentialCapture, 100);
      }
    },
    true
  );
}

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    const msg = message as {
      type: string;
      payload?: { username: string; password: string };
    };
    if (msg.type === "FILL_CREDENTIAL" && msg.payload) {
      const passwordField = document.querySelector<HTMLInputElement>(
        'input[type="password"]'
      );
      if (passwordField) {
        fillCredential(msg.payload.username, msg.payload.password, passwordField);
        sendResponse({ success: true });
      } else {
        sendResponse({ error: "No password field found" });
      }
    }
    return false;
  }
);

document.addEventListener("click", (e) => {
  if (!currentDropdown)
    return;

  const target = e.target as HTMLElement;
  if (target.closest(".pv-dropdown"))
    return;

  if (target === activePasswordField)
    return;

  if (activePasswordField) {
    const usernameField = findUsernameField(activePasswordField);
    if (target === usernameField)
      return;
  }
  closeDropdown();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDropdown();
    closeSaveBanner();
  }
});

const observer = new MutationObserver(() => {
  scanForFields();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

let lastUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    currentDomain = getDomain();
    closeDropdown();
    closeSaveBanner();
    lastCapturedUsername = "";
    lastCapturedPassword = "";
    saveBannerShownThisPage = false;
    setTimeout(scanForFields, 500);
  }
}, 1000);

async function checkPendingSaveOnLoad(): Promise<void> {
  if (saveBannerShownThisPage) return;

  try {
    const domain = getDomain();
    const res = (await chrome.runtime.sendMessage({
      type: "GET_PENDING_SAVE",
      payload: { domain },
    })) as { pending?: { domain: string; username: string; password: string } } | undefined;

    if (!res?.pending) return;

    showSaveBanner(res.pending.domain, res.pending.username, res.pending.password);
  } catch {}
}

scanForFields();
detectFormSubmission();

setTimeout(checkPendingSaveOnLoad, 500);