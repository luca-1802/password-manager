import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Select from "../../../components/ui/Select";

const options = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
  { value: "c", label: "Option C" },
];

describe("Select", () => {
  it("renders with combobox role", () => {
    render(<Select value="" onChange={() => {}} options={options} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows placeholder when no value selected", () => {
    render(<Select value="" onChange={() => {}} options={options} placeholder="Choose one" />);
    expect(screen.getByText("Choose one")).toBeInTheDocument();
  });

  it("shows selected option label", () => {
    render(<Select value="b" onChange={() => {}} options={options} />);
    expect(screen.getByText("Option B")).toBeInTheDocument();
  });

  it("starts closed", () => {
    render(<Select value="" onChange={() => {}} options={options} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("opens dropdown on click", async () => {
    render(<Select value="" onChange={() => {}} options={options} />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("renders all options in dropdown", async () => {
    render(<Select value="" onChange={() => {}} options={options} />);
    await userEvent.click(screen.getByRole("combobox"));

    const optionElements = screen.getAllByRole("option");
    expect(optionElements).toHaveLength(3);
  });

  it("marks selected option with aria-selected", async () => {
    render(<Select value="b" onChange={() => {}} options={options} />);
    await userEvent.click(screen.getByRole("combobox"));

    const selected = screen.getAllByRole("option").find(
      (el) => el.getAttribute("aria-selected") === "true"
    );
    expect(selected).toHaveTextContent("Option B");
  });

  it("calls onChange when option clicked", async () => {
    const onChange = jest.fn();
    render(<Select value="" onChange={onChange} options={options} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByText("Option C"));
    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("has haspopup attribute", () => {
    render(<Select value="" onChange={() => {}} options={options} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-haspopup", "listbox");
  });

  it("applies custom className", () => {
    render(<Select value="" onChange={() => {}} options={options} className="custom" />);
    expect(screen.getByRole("combobox").className).toContain("custom");
  });
});