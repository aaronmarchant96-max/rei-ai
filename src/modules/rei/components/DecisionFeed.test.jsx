import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DecisionFeed from "./DecisionFeed.jsx";

const mockGetDecisions = jest.fn();
const mockDeleteDecision = jest.fn();
const mockClearDecisions = jest.fn();

jest.mock("../../../lib/decisionStore", () => ({
  getDecisions: (...args) => mockGetDecisions(...args),
  deleteDecision: (...args) => mockDeleteDecision(...args),
  clearDecisions: (...args) => mockClearDecisions(...args),
}));

const sampleEntry = {
  id: "1743660000000-structured-a3f2",
  domainLabel: "The Generalist",
  inputPreview: "Should I shut down the pump?",
  createdAt: "2026-08-05T12:00:00Z",
  routerDecision: {
    label: "Structured Reasoning",
    model: "llama-3.3-70b-versatile",
    hingeScore: 0.72,
  },
  sections: {},
  actualTokens: 1200,
  actualCost: 0.0004,
};

const makeEntry = (overrides = {}) => ({ ...sampleEntry, ...overrides });

describe("DecisionFeed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
    URL.revokeObjectURL = jest.fn();
  });

  it("renders 'No decisions stored' when the store is empty", () => {
    mockGetDecisions.mockReturnValue([]);
    render(<DecisionFeed />);
    expect(screen.getByText(/No CARDO decisions/i)).toBeInTheDocument();
  });

  it("renders a list when decisions are present", () => {
    mockGetDecisions.mockReturnValue([sampleEntry]);
    render(<DecisionFeed />);
    expect(screen.getByText(/Should I shut down/)).toBeInTheDocument();
    expect(screen.getAllByText(/The Generalist/).length).toBeGreaterThan(0);
  });

  it("shows domain filter dropdown with unique domain labels", () => {
    mockGetDecisions.mockReturnValue([
      makeEntry({ id: "1", domainLabel: "The Generalist" }),
      makeEntry({ id: "2", domainLabel: "The Engineer" }),
      makeEntry({ id: "3", domainLabel: "The Generalist" }),
    ]);
    render(<DecisionFeed />);
    // "All Domains" + 2 unique labels = 3 options
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(screen.getByText("The Generalist (2)")).toBeInTheDocument();
    expect(screen.getByText("The Engineer (1)")).toBeInTheDocument();
  });

  it("filters the list when a domain is selected", async () => {
    mockGetDecisions.mockReturnValue([
      makeEntry({ id: "1", domainLabel: "The Generalist", inputPreview: "generalist query" }),
      makeEntry({ id: "2", domainLabel: "The Engineer", inputPreview: "engineer query" }),
    ]);
    render(<DecisionFeed />);
    
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "The Engineer" } });
    
    await waitFor(() => {
      expect(screen.getByText("engineer query")).toBeInTheDocument();
    });
    expect(screen.queryByText("generalist query")).not.toBeInTheDocument();
  });

  it("shows entry count in the header", () => {
    mockGetDecisions.mockReturnValue([sampleEntry]);
    render(<DecisionFeed />);
    expect(screen.getByText(/1 decision/i)).toBeInTheDocument();
  });

  it("expands detail on row click and collapses on second click", async () => {
    mockGetDecisions.mockReturnValue([sampleEntry]);
    render(<DecisionFeed />);
    
    const row = screen.getByText(/Should I shut down/);
    fireEvent.click(row);
    
    await waitFor(() => {
      expect(screen.getByText("CARDO Decision Report")).toBeInTheDocument();
    });
    
    fireEvent.click(row);
    await waitFor(() => {
      expect(screen.queryByText("CARDO Decision Report")).not.toBeInTheDocument();
    });
  });

  it("deletes a single entry on trash click", async () => {
    mockGetDecisions.mockReturnValue([sampleEntry]);
    const { container } = render(<DecisionFeed />);
    
    // Find the delete button (trash icon labelled "Delete")
    const deleteBtn = container.querySelector('[aria-label="Delete decision"]');
    fireEvent.click(deleteBtn);
    
    expect(mockDeleteDecision).toHaveBeenCalledWith(sampleEntry.id);
  });

  it("exports CSV when the CSV button is clicked", async () => {
    mockGetDecisions.mockReturnValue([sampleEntry]);
    render(<DecisionFeed />);
    
    // Mock URL.createObjectURL and link.click
    const clickSpy = jest.fn();
    const origCreateObjectURL = URL.createObjectURL;
    const origAppendChild = document.body.appendChild;
    const origRemoveChild = document.body.removeChild;
    URL.createObjectURL = jest.fn(() => "blob:test");
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    HTMLAnchorElement.prototype.click = clickSpy;
    
    const csvBtn = screen.getByText("Export CSV");
    fireEvent.click(csvBtn);
    
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    
    URL.createObjectURL = origCreateObjectURL;
    document.body.appendChild = origAppendChild;
    document.body.removeChild = origRemoveChild;
    delete HTMLAnchorElement.prototype.click;
  });

  it("exports JSON when the JSON button is clicked", async () => {
    mockGetDecisions.mockReturnValue([sampleEntry]);
    render(<DecisionFeed />);
    
    const clickSpy = jest.fn();
    HTMLAnchorElement.prototype.click = clickSpy;
    const origCreateObjectURL = URL.createObjectURL;
    const origAppendChild = document.body.appendChild;
    const origRemoveChild = document.body.removeChild;
    URL.createObjectURL = jest.fn(() => "blob:json");
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    
    const jsonBtn = screen.getByText("Export JSON");
    fireEvent.click(jsonBtn);
    
    expect(clickSpy).toHaveBeenCalled();
    
    URL.createObjectURL = origCreateObjectURL;
    document.body.appendChild = origAppendChild;
    document.body.removeChild = origRemoveChild;
    delete HTMLAnchorElement.prototype.click;
  });

  it("clears all decisions on 'Clear All' click", () => {
    mockGetDecisions.mockReturnValue([sampleEntry]);
    render(<DecisionFeed />);
    
    const clearBtn = screen.getByText("Clear All");
    fireEvent.click(clearBtn);
    
    expect(mockClearDecisions).toHaveBeenCalled();
  });
});
