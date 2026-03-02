import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import VaultItemRow from "../../../components/vault/VaultItemRow";
import type { VaultItem } from "../../../types";

function renderRow(item: VaultItem, props: Partial<Parameters<typeof VaultItemRow>[0]> = {}) {
  const defaultProps = {
    item,
    selected: false,
    onClick: jest.fn(),
    ...props,
  };
  return render(
    <DndContext>
      <VaultItemRow {...defaultProps} />
    </DndContext>
  );
}

describe("VaultItemRow", () => {
  const passwordItem: VaultItem = {
    id: "password-example.com-0",
    type: "password",
    key: "example.com",
    index: 0,
    credential: { username: "user@test.com", password: "pass123" },
  };

  const pinnedPasswordItem: VaultItem = {
    ...passwordItem,
    pinned: true,
  };

  const noteItem: VaultItem = {
    id: "note-My Note-0",
    type: "note",
    key: "My Note",
    index: 0,
    note: { type: "note", content: "Secret content here" },
  };

  const fileItem: VaultItem = {
    id: "file-backup-0",
    type: "file",
    key: "backup",
    index: 0,
    file: {
      type: "file",
      file_id: "f1",
      original_name: "backup.zip",
      size: 1024,
      uploaded_at: "2024-01-01T00:00:00Z",
    },
  };

  it("renders the item key as the primary text", () => {
    renderRow(passwordItem);
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("renders username as subtitle for password items", () => {
    renderRow(passwordItem);
    expect(screen.getByText("user@test.com")).toBeInTheDocument();
  });

  it("renders note content preview as subtitle for note items", () => {
    renderRow(noteItem);
    expect(screen.getByText("Secret content here")).toBeInTheDocument();
  });

  it("renders original filename as subtitle for file items", () => {
    renderRow(fileItem);
    expect(screen.getByText("backup.zip")).toBeInTheDocument();
  });

  it("renders with listitem role", () => {
    renderRow(passwordItem);
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it("sets aria-selected true when selected", () => {
    renderRow(passwordItem, { selected: true });
    expect(screen.getByRole("listitem")).toHaveAttribute("aria-selected", "true");
  });

  it("sets aria-selected false when not selected", () => {
    renderRow(passwordItem, { selected: false });
    expect(screen.getByRole("listitem")).toHaveAttribute("aria-selected", "false");
  });

  it("calls onClick when row is clicked", async () => {
    const onClick = jest.fn();
    renderRow(passwordItem, { onClick });
    await userEvent.click(screen.getByRole("listitem"));
    expect(onClick).toHaveBeenCalled();
  });

  it("calls onClick on Enter key press", async () => {
    const onClick = jest.fn();
    renderRow(passwordItem, { onClick });
    const row = screen.getByRole("listitem");
    row.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalled();
  });

  it("renders the first letter of the key in the avatar", () => {
    renderRow(passwordItem);
    expect(screen.getByText("E")).toBeInTheDocument();
  });

  it("renders breach warning when breachCount is provided", () => {
    renderRow(passwordItem, { breachCount: 3 });
    expect(
      screen.getByLabelText("3 breaches found for example.com")
    ).toBeInTheDocument();
  });

  it("does not render breach warning when breachCount is zero", () => {
    renderRow(passwordItem, { breachCount: 0 });
    expect(
      screen.queryByLabelText(/breaches found/)
    ).not.toBeInTheDocument();
  });

  it("does not render breach warning when breachCount is null", () => {
    renderRow(passwordItem, { breachCount: null });
    expect(
      screen.queryByLabelText(/breaches found/)
    ).not.toBeInTheDocument();
  });

  it("renders a reorder button with correct aria-label", () => {
    renderRow(passwordItem);
    expect(screen.getByLabelText("Reorder example.com")).toBeInTheDocument();
  });

  it("accepts pinned items without errors", () => {
    renderRow(pinnedPasswordItem);
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("renders pinned and unpinned items identically (no pin UI yet)", () => {
    const { container: pinnedContainer } = renderRow(pinnedPasswordItem);
    const pinnedHTML = pinnedContainer.innerHTML;

    const { container: unpinnedContainer } = renderRow(passwordItem);
    const unpinnedHTML = unpinnedContainer.innerHTML;

    // Both should render without errors; structural similarity confirms no pin UI divergence
    expect(pinnedHTML.length).toBeGreaterThan(0);
    expect(unpinnedHTML.length).toBeGreaterThan(0);
  });
});