import { fireEvent, render, screen } from "@testing-library/react";
import ChatBubble from "./ChatBubble.jsx";

describe("ChatBubble", () => {
  const baseMsg = {
    sender: "rei",
    text: "Here is a direct answer to your question.",
    timestamp: "12:00",
    rawJson: {
      routerDecision: {
        id: "structured-reasoning",
        label: "Structured Reasoning",
        model: "llama-3.3-70b-versatile",
        maxTokens: 400,
        qualityGate: "Hinge + Facts + Move",
        enforce: null,
        estimatedCost: 0.000552,
        premiumCost: 0.005,
      },
    },
  };

  it("renders plain text for non-structured messages", () => {
    render(<ChatBubble msg={baseMsg} selectedDomain="assistant" mobile={false} onCopy={jest.fn()} />);
    expect(screen.getByText("Here is a direct answer to your question.")).toBeInTheDocument();
  });

  it("renders CARDO structured sections when present", () => {
    const structuredMsg = {
      ...baseMsg,
      text: "Intro text.\n\nHinge: The core pivot point.\n\nFacts: What is known.\n\nMove: Next step.",
    };
    render(<ChatBubble msg={structuredMsg} selectedDomain="assistant" mobile={false} onCopy={jest.fn()} />);
    expect(screen.getByText(/HINGE/)).toBeInTheDocument();
    expect(screen.getByText(/FACTS/)).toBeInTheDocument();
    expect(screen.getByText(/NEXT MOVE/)).toBeInTheDocument();
  });

  it("renders router badge for assistant messages", () => {
    render(<ChatBubble msg={baseMsg} selectedDomain="assistant" mobile={false} onCopy={jest.fn()} />);
    expect(screen.getAllByText("Structured Reasoning").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("llama-3.3-70b-versatile").length).toBeGreaterThanOrEqual(1);
  });

  it("does not render CARDO cards for non-assistant domains", () => {
    const structuredMsg = {
      ...baseMsg,
      text: "Intro.\n\nHinge: Something.\n\nFacts: Something else.\n\nMove: Do this.",
    };
    render(<ChatBubble msg={structuredMsg} selectedDomain="coding" mobile={false} onCopy={jest.fn()} />);
    expect(screen.queryByText(/HINGE/)).not.toBeInTheDocument();
  });

  it("renders copy button", () => {
    render(<ChatBubble msg={baseMsg} selectedDomain="assistant" mobile={false} onCopy={jest.fn()} />);
    expect(screen.getByTitle("Copy message")).toBeInTheDocument();
  });

  it("fires onCopy with the message text and shows feedback when Copy is clicked", async () => {
    const onCopy = jest.fn().mockResolvedValue(true);
    render(<ChatBubble msg={baseMsg} selectedDomain="assistant" mobile={false} onCopy={onCopy} />);
    fireEvent.click(screen.getByTitle("Copy message"));
    expect(onCopy).toHaveBeenCalledWith("Here is a direct answer to your question.");
    expect(await screen.findByText("Copied ✓")).toBeInTheDocument();
  });

  it("renders export button for structured CARDO replies", () => {
    const onExport = jest.fn();
    const structuredMsg = {
      ...baseMsg,
      text: "Intro text.\n\nHinge: The core pivot point.\n\nFacts: What is known.\n\nMove: Next step.",
    };

    render(<ChatBubble msg={structuredMsg} selectedDomain="assistant" mobile={false} onCopy={jest.fn()} onExport={onExport} domainLabel="Legal" />);
    fireEvent.click(screen.getByTitle("Export Report decision"));

    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({
      domainLabel: "Legal",
      sections: expect.objectContaining({
        Hinge: "The core pivot point.",
      }),
    }));
  });
});
