import { flattenVaultItems, filterVaultItems } from "../../lib/vaultItems";
import type { PasswordMap, NotesMap, FilesMap, VaultItem } from "../../types";

const mockPasswords: PasswordMap = {
  "github.com": [
    { username: "user1", password: "pass1", folder: "dev" },
    { username: "user2", password: "pass2", folder: null },
  ],
  "google.com": [
    { username: "main@gmail.com", password: "gpass", folder: "personal" },
  ],
};

const mockNotes: NotesMap = {
  "API Keys": [
    { type: "note", content: "secret-key-123", folder: "dev" },
  ],
};

const mockFiles: FilesMap = {
  "backup": [
    {
      type: "file",
      file_id: "f1",
      original_name: "backup.zip",
      size: 1024,
      folder: "personal",
      uploaded_at: "2024-01-01T00:00:00Z",
      description: "Monthly backup",
    },
  ],
};

describe("flattenVaultItems", () => {
  it("flattens passwords, notes, and files into a single array", () => {
    const items = flattenVaultItems(mockPasswords, mockNotes, mockFiles);
    expect(items).toHaveLength(5);
  });

  it("creates correct IDs for password items", () => {
    const items = flattenVaultItems(mockPasswords, {}, {});
    const githubItems = items.filter((i) => i.key === "github.com");
    expect(githubItems).toHaveLength(2);
    expect(githubItems[0]!.id).toBe("password-github.com-0");
    expect(githubItems[1]!.id).toBe("password-github.com-1");
  });

  it("creates correct IDs for note items", () => {
    const items = flattenVaultItems({}, mockNotes, {});
    expect(items[0]!.id).toBe("note-API Keys-0");
    expect(items[0]!.type).toBe("note");
  });

  it("creates correct IDs for file items", () => {
    const items = flattenVaultItems({}, {}, mockFiles);
    expect(items[0]!.id).toBe("file-backup-0");
    expect(items[0]!.type).toBe("file");
  });

  it("preserves folder assignments", () => {
    const items = flattenVaultItems(mockPasswords, mockNotes, mockFiles);
    const devItems = items.filter((i) => i.folder === "dev");
    expect(devItems).toHaveLength(2);
  });

  it("preserves credential data on password items", () => {
    const items = flattenVaultItems(mockPasswords, {}, {});
    const item = items.find((i) => i.key === "google.com");
    expect(item!.credential!.username).toBe("main@gmail.com");
  });

  it("returns empty array for empty vault", () => {
    const items = flattenVaultItems({}, {}, {});
    expect(items).toHaveLength(0);
  });
});

describe("filterVaultItems", () => {
  let allItems: VaultItem[];

  beforeEach(() => {
    allItems = flattenVaultItems(mockPasswords, mockNotes, mockFiles);
  });

  it("returns all items when filter is 'all' and search is empty", () => {
    const filtered = filterVaultItems(allItems, "", "all");
    expect(filtered).toHaveLength(5);
  });

  it("filters by folder name", () => {
    const filtered = filterVaultItems(allItems, "", "dev");
    expect(filtered).toHaveLength(2);
    filtered.forEach((item) => expect(item.folder).toBe("dev"));
  });

  it("filters unfiled items", () => {
    const filtered = filterVaultItems(allItems, "", "unfiled");
    expect(filtered).toHaveLength(1);
    filtered.forEach((item) => expect(item.folder).toBeFalsy());
  });

  it("searches passwords by key", () => {
    const filtered = filterVaultItems(allItems, "github", "all");
    expect(filtered.length).toBeGreaterThanOrEqual(2);
  });

  it("searches passwords by username", () => {
    const filtered = filterVaultItems(allItems, "main@gmail", "all");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.key).toBe("google.com");
  });

  it("searches notes by content", () => {
    const filtered = filterVaultItems(allItems, "secret-key", "all");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.type).toBe("note");
  });

  it("searches files by original name", () => {
    const filtered = filterVaultItems(allItems, "backup.zip", "all");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.type).toBe("file");
  });

  it("searches files by description", () => {
    const filtered = filterVaultItems(allItems, "Monthly", "all");
    expect(filtered).toHaveLength(1);
  });

  it("search is case-insensitive", () => {
    const filtered = filterVaultItems(allItems, "GITHUB", "all");
    expect(filtered.length).toBeGreaterThanOrEqual(2);
  });

  it("combines folder filter and search", () => {
    const filtered = filterVaultItems(allItems, "user1", "dev");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.credential!.username).toBe("user1");
  });

  it("returns empty array when nothing matches", () => {
    const filtered = filterVaultItems(allItems, "nonexistent", "all");
    expect(filtered).toHaveLength(0);
  });
});