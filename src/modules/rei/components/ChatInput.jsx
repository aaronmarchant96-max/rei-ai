export default function ChatInput({
  inputMessage,
  setInputMessage,
  selectedDomain,
  onSend,
  inputRef,
  mobile,
  generalistPrompts,
  assistantPromptIndex,
  setAssistantPromptIndex
}) {
  const quickPrompts = [
    { label: "💡 Sort out a problem", text: "Help me sort this out" },
    { label: "⚡ Find the hinge", text: "What is the real hinge?" },
    { label: "❓ Check assumptions", text: "Separate facts from assumptions" },
    { label: "⚖️ What changes it?", text: "What would change my mind?" },
  ];

  return (
    <div className="rei-input-shell" style={{ position: "sticky", bottom: 0, zIndex: 40 }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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
            onSend();
          }}
        >
          <div className="rei-input-row">
            <textarea
              ref={inputRef}
              className="rei-input-area"
              rows={mobile ? 2 : 2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder={
                selectedDomain === "coding"
                  ? "Describe the feature or bug — REI will find the architectural hinge and write verification-first code."
                  : selectedDomain === "red-team"
                    ? "Paste your prompt or system policy — REI will run red-team taxonomy stress testing."
                    : "What are you trying to think through?"
              }
            />
            <button
              type="submit"
              className="rei-touch-button"
              disabled={!inputMessage.trim()}
              style={{ opacity: inputMessage.trim() ? 1 : 0.6 }}
            >
              Send ➔
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
            <span>⚡ <strong>Night Shift v3:</strong> Cost-aware LLM auto-routing active (&lt;5ms)</span>
            <span style={{ opacity: 0.8 }}>Shift + Enter for new line</span>
          </div>
        </form>
      </div>
    </div>
  );
}
