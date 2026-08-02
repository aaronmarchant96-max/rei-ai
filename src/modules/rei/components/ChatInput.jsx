import { useRei } from "../ReiContext.js";

export default function ChatInput() {
  const { inputMessage, setInputMessage, selectedDomain, handleSendMessage, inputRef, mobile, generalistPrompts, assistantPromptIndex, setAssistantPromptIndex } = useRei();

  const quickPrompts = [
    { label: "💡 Sort out a problem", text: "Help me sort this out" },
    { label: "⚡ Find the hinge", text: "What is the real hinge?" },
    { label: "❓ Check assumptions", text: "Separate facts from assumptions" },
    { label: "⚖️ What changes it?", text: "What would change my mind?" },
  ];

  return (
    <div className="rei-input-shell" style={{ position: "sticky", bottom: 0, zIndex: 40, padding: "12px 16px 16px", background: "var(--surface)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        {selectedDomain === "assistant" && (
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px" }}>
            {quickPrompts.map((item) => (
              <button
                key={item.label}
                type="button"
                className="rei-quick-prompt"
                onClick={() => setInputMessage(item.text)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <form
          className="rei-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <div className="rei-input-row">
            <textarea
              ref={inputRef}
              className="rei-input-area"
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                selectedDomain === "coding"
                  ? "Describe the feature or bug — REI will find the architectural hinge and write verification-first code."
                  : selectedDomain === "red-team"
                    ? "Type your adversarial prompt or vulnerability scenario..."
                    : selectedDomain === "genealogy"
                      ? "Type your genealogy question or family history puzzle..."
                      : selectedDomain === "story"
                        ? "Describe the story seed, character, or arc you want to build..."
                        : selectedDomain === "legal"
                          ? "Enter a case name, citation, or legal question..."
                          : "What are you trying to think through?"
              }
            />
            <button type="submit" className="rei-touch-button touch-target" style={{ minWidth: "64px" }}>
              Send
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
