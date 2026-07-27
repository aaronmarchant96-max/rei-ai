export default function ChatInput({ inputMessage, setInputMessage, selectedDomain, onSend, inputRef, mobile, generalistPrompts, assistantPromptIndex, setAssistantPromptIndex }) {
  return (
    <div className="rei-input-shell fixed bottom-0 safe-bottom" style={{ maxWidth: mobile ? undefined : "1400px" }}>
      <form className="rei-input-form" onSubmit={onSend}>
        {selectedDomain === "assistant" && (
          <div className="rei-input-row" style={{ flexWrap: "wrap", justifyContent: mobile ? "stretch" : "center" }}>
            {generalistPrompts.map((prompt, index) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setInputMessage(prompt);
                  setAssistantPromptIndex(index);
                }}
                className="rei-quick-prompt"
                style={{ flex: mobile ? "1 1 30%" : "1 1 auto", minWidth: mobile ? "100px" : "180px" }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        <div className="rei-input-row">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={selectedDomain === "assistant" ? "What are you thinking through?" : "Type proof context or statements to evaluate..."}
            className="rei-input-area"
            style={{ flex: 1, padding: mobile ? "14px 16px" : "12px 16px", minHeight: "48px" }}
          />
          <button
            type="submit"
            className="rei-touch-button touch-target"
            style={{ padding: mobile ? "14px 28px" : "12px 24px", minHeight: "48px", height: "48px" }}
            onMouseOver={(e) => e.currentTarget.style.background = "#fb923c"}
            onMouseOut={(e) => e.currentTarget.style.background = "#f97316"}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
