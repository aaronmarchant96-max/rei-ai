import { fireEvent, render, screen } from "@testing-library/react";
import ToolsLanding from "./ToolsLanding.jsx";
import claimsData from "./data/claims.json";

describe("ToolsLanding", () => {
  it("renders hero with Aaron Marchant attribution and Try REI.ai button", () => {
    const { container } = render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText(/Aaron Marchant/i)).toBeInTheDocument();
    expect(container.querySelector(".rei-landing-hero__art")).toHaveAttribute(
      "src",
      "/rei-cardo-horizon-noc.webp"
    );
    expect(container.querySelector(".rei-landing-hero__art")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("heading", { name: /one place to ask.*a model matched to the job/i })).toBeInTheDocument();
    expect(screen.getByText(/looks at the job, chooses an AI model suited to it/i)).toBeInTheDocument();
    expect(screen.getByText("Use it")).toBeInTheDocument();
    expect(screen.getByText("Connect it")).toBeInTheDocument();
    expect(screen.getByText("Inspect it")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try rei\.ai/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view engineering case study/i })).toBeInTheDocument();
  });

  it("renders stats badges with accuracy and test count", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getAllByText(new RegExp(`${claimsData.testCount}\\+`)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Passing Tests").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Router Accuracy (implemented routes)")).toBeInTheDocument();
  });

  it("explains the REI Method, product layers, entry offer, and formal CARDO engine", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByRole("heading", { name: /the rei method/i })).toBeInTheDocument();
    expect(screen.getByText(/what kind of job is this/i)).toBeInTheDocument();
    expect(screen.getByText(/which model should handle it/i)).toBeInTheDocument();
    expect(screen.getByText(/what rules must the answer follow/i)).toBeInTheDocument();
    expect(screen.getByText(/did it finish correctly/i)).toBeInTheDocument();
    expect(screen.getByText(/can we prove what happened/i)).toBeInTheDocument();
    expect(screen.getByText("REI Engine")).toBeInTheDocument();
    expect(screen.getByText("REI Studio")).toBeInTheDocument();
    expect(screen.getByText("REI Decision Audit")).toBeInTheDocument();
    expect(screen.getByText(/CARDO is the formal execution cycle/i)).toBeInTheDocument();
    expect(screen.getByText("Collect")).toBeInTheDocument();
    expect(screen.getByText(/gather raw inputs/i)).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
    expect(screen.getByText("Evaluate")).toBeInTheDocument();
  });

  it("renders the methodology flow (find the hinge → test/measure/trace → gate → iterate)", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByRole("heading", { name: /built on a verified.*engineering methodology/i })).toBeInTheDocument();
    expect(screen.getByText(/find the hinge/i)).toBeInTheDocument();
    expect(screen.getByText(/verified evidence/i)).toBeInTheDocument();
    expect(screen.getByText(/human \/ claims gate/i)).toBeInTheDocument();
    expect(screen.getByText(/the artifact proposes, the human decides/i)).toBeInTheDocument();
    expect(screen.getAllByText(/iterate/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/closed loop/i)).toBeInTheDocument();
  });

  it("renders router demo with scenario buttons", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText(/cost-aware llm router/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /coding task/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Greeting" })).toBeInTheDocument();
  });

  it("renders domain experiments section as the benchmarks and stress tests", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText(/experiments & benchmarks/i)).toBeInTheDocument();
    expect(screen.getByText(/laboratory & stress tests/i)).toBeInTheDocument();
    expect(screen.getByText(/the furnace/i)).toBeInTheDocument();
    expect(screen.getByText(/storm replay/i)).toBeInTheDocument();
  });

  it("navigates to REI from hero Try REI.ai button", () => {
    const onOpenTool = jest.fn();
    render(<ToolsLanding onOpenTool={onOpenTool} />);

    fireEvent.click(screen.getByRole("button", { name: /try rei\.ai/i }));
    expect(onOpenTool).toHaveBeenCalledWith({ tool: "rei" });
  });

  it("surfaces a prominent analytics CTA next to the action buttons", () => {
    const onOpenTool = jest.fn();
    render(<ToolsLanding onOpenTool={onOpenTool} />);

    const cta = screen.getByRole("button", { name: /view measured savings analytics/i });
    expect(cta).toBeInTheDocument();
    fireEvent.click(cta);
    expect(onOpenTool).toHaveBeenCalledWith({ tool: "analytics" });
  });

  it("renders footer", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getAllByText(/github/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/by prompthound/i)).toBeInTheDocument();
  });

  it("opens a tool from the full card surface", () => {
    const onOpenTool = jest.fn();
    render(<ToolsLanding onOpenTool={onOpenTool} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /openai proxy gateway/i,
      })
    );

    expect(onOpenTool).toHaveBeenCalledWith({
      tool: "rei",
    });
  });

  it("renders all eight tool cards as semantic buttons without nested interactive button controls", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    const proxyBtn = screen.getByRole("button", { name: /core gateway\s*openai proxy gateway/i });
    const analyticsBtn = screen.getByRole("button", { name: /observability\s*analytics/i });
    const redTeamBtn = screen.getByRole("button", { name: /adversarial\s*red team/i });
    const cardoBtn = screen.getByRole("button", { name: /risk gate\s*cardo guard/i });
    const traceBtn = screen.getByRole("button", { name: /telemetry\s*tracepoint/i });
    const furnaceBtn = screen.getByRole("button", { name: /pressure test\s*the furnace/i });
    const storyBtn = screen.getByRole("button", { name: /narrative blueprint\s*story forge/i });
    const stormBtn = screen.getByRole("button", { name: /radar & motion\s*storm replay/i });

    expect(proxyBtn).toBeInTheDocument();
    expect(analyticsBtn).toBeInTheDocument();
    expect(redTeamBtn).toBeInTheDocument();
    expect(cardoBtn).toBeInTheDocument();
    expect(traceBtn).toBeInTheDocument();
    expect(furnaceBtn).toBeInTheDocument();
    expect(storyBtn).toBeInTheDocument();
    expect(stormBtn).toBeInTheDocument();

    // Verify there are no nested <button> elements inside card buttons
    const toolButtons = [proxyBtn, analyticsBtn, redTeamBtn, cardoBtn, traceBtn, furnaceBtn, storyBtn, stormBtn];
    for (const btn of toolButtons) {
      expect(btn.querySelectorAll("button").length).toBe(0);
    }
  });

  it("renders category taxonomy and normalized badge metadata", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText("Core Gateway")).toBeInTheDocument();
    expect(screen.getByText("Observability")).toBeInTheDocument();
    expect(screen.getByText("Adversarial")).toBeInTheDocument();
    expect(screen.getByText("Risk Gate")).toBeInTheDocument();
    expect(screen.getByText(`✅ ${claimsData.testCount}+ Passing Tests`)).toBeInTheDocument();
  });

  it("applies featured full-width layout to the primary OpenAI Proxy Gateway card", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    const proxyBtn = screen.getByRole("button", { name: /openai proxy gateway/i });
    expect(proxyBtn.className).toContain("md:col-span-2");
  });
});
