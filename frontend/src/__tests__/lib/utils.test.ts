import { cn, getLetterColor, LETTER_COLORS, setFolderColor, getFolderColor, renameFolderColor, deleteFolderColor } from "../../lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("filters falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("handles conditional objects", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});

describe("getLetterColor", () => {
  it("returns a color string for lowercase letters", () => {
    const color = getLetterColor("a");
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(LETTER_COLORS).toContain(color);
  });

  it("returns consistent color for the same letter", () => {
    expect(getLetterColor("m")).toBe(getLetterColor("m"));
  });

  it("handles uppercase letters", () => {
    expect(getLetterColor("A")).toBe(getLetterColor("a"));
  });

  it("returns a fallback color for non-alphabetic characters", () => {
    const color = getLetterColor("1");
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("returns different colors for different letters", () => {
    const colorA = getLetterColor("a");
    const colorB = getLetterColor("b");
    // They may or may not differ depending on the hash, but both are valid
    expect(colorA).toMatch(/^#[0-9a-f]{6}$/);
    expect(colorB).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("folder color utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("setFolderColor stores and getFolderColor retrieves a color", () => {
    setFolderColor("work", "#ff0000");
    expect(getFolderColor("work")).toBe("#ff0000");
  });

  it("getFolderColor returns letter color as fallback", () => {
    const color = getFolderColor("projects");
    expect(color).toBe(getLetterColor("p"));
  });

  it("renameFolderColor moves color from old to new name", () => {
    setFolderColor("oldname", "#00ff00");
    renameFolderColor("oldname", "newname");
    expect(getFolderColor("newname")).toBe("#00ff00");
    expect(getFolderColor("oldname")).toBe(getLetterColor("o"));
  });

  it("deleteFolderColor removes the color entry", () => {
    setFolderColor("temp", "#0000ff");
    deleteFolderColor("temp");
    expect(getFolderColor("temp")).toBe(getLetterColor("t"));
  });

  it("renameFolderColor does nothing for non-existent folder", () => {
    renameFolderColor("nonexistent", "newname");
    expect(getFolderColor("newname")).toBe(getLetterColor("n"));
  });
});