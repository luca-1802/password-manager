import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommandPalette from "../../../components/ui/CommandPalette";
import type { VaultItem } from "../../../types";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockItems: VaultItem[] = [
  {
    id: "pw-1",
    type: "password",
    key: "github.com",
    index: 0,
    credential: { username: "dev@github.com", password: "pass123" },
  },
  {
    id: "note-1",
    type: "note",
    key: "API Keys",
    index: 0,
    note: { type: "note", content: "secret-key-123" },
  },
];

const mockActions = [
  { id: "add-pw", label: "Add Password", icon: <span>+</span>, action: jest.fn() },
  { id: "settings", label: "Settings", icon: <span>S</span>, action: jest.fn() },
];

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    render(
      <CommandPalette
        open={false}
        onClose={() => {}}
        items={mockItems}
        onSelectItem={() => {}}
        actions={mockActions}
      />
    );
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
  });

  it("renders search input when open", () => {
    render(
      <CommandPalette
        open={true}
        onClose={() => {}}
        items={mockItems}
        onSelectItem={() => {}}
        actions={mockActions}
      />
    );
    expect(screen.getByPlaceholderText(/search vault/i)).toBeInTheDocument();
  });

  it("shows actions by default (no query)", () => {
    render(
      <CommandPalette
        open={true}
        onClose={() => {}}
        items={mockItems}
        onSelectItem={() => {}}
        actions={mockActions}
      />
    );
    expect(screen.getByText("Add Password")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("filters vault items on search", async () => {
    render(
      <CommandPalette
        open={true}
        onClose={() => {}}
        items={mockItems}
        onSelectItem={() => {}}
        actions={mockActions}
      />
    );

    await userEvent.type(screen.getByPlaceholderText(/search/i), "github");
    expect(screen.getByText("github.com")).toBeInTheDocument();
  });

  it("shows 'No results found' for unmatched query", async () => {
    render(
      <CommandPalette
        open={true}
        onClose={() => {}}
        items={mockItems}
        onSelectItem={() => {}}
        actions={[]}
      />
    );

    await userEvent.type(screen.getByPlaceholderText(/search/i), "zzznonexistent");
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("calls onClose when backdrop clicked", async () => {
    const onClose = jest.fn();
    render(
      <CommandPalette
        open={true}
        onClose={onClose}
        items={mockItems}
        onSelectItem={() => {}}
        actions={mockActions}
      />
    );

    const backdrop = document.querySelector(".bg-black\\/60");
    if (backdrop) {
      await userEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it("shows ESC keyboard hint", () => {
    render(
      <CommandPalette
        open={true}
        onClose={() => {}}
        items={mockItems}
        onSelectItem={() => {}}
        actions={mockActions}
      />
    );
    expect(screen.getByText("ESC")).toBeInTheDocument();
  });
});