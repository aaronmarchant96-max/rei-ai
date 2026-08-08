import { useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { useRei } from "../ReiContext.js";
import { readTextFile, MAX_FILE_SIZE, MAX_FILE_COUNT, MAX_COMBINED_SIZE } from "../../../lib/fileExtractor.js";

export default function ChatInput() {
  const { inputMessage, setInputMessage, selectedDomain, handleSendMessage, inputRef, mobile, generalistPrompts, assistantPromptIndex, setAssistantPromptIndex, attachedFiles, setAttachedFiles } = useRei();
  const fileInputRef = useRef(null);

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

        {attachedFiles && attachedFiles.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", paddingBottom: "8px" }}>
            {attachedFiles.map((f, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  padding: "2px 8px", borderRadius: "6px", fontSize: "11px",
                  background: "var(--cardo-bg, #1e293b)", color: "var(--foreground-muted, #94a3b8)",
                  border: "1px solid var(--border, #334155)", maxWidth: "200px",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <X
                  size={12}
                  style={{ cursor: "pointer", flexShrink: 0, color: "var(--foreground-muted, #64748b)" }}
                  onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
                />
              </span>
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
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={async (e) => {
                const selectedFiles = Array.from(e.target.files || []);
                if (attachedFiles.length + selectedFiles.length > MAX_FILE_COUNT) {
                  console.warn(`Cannot attach more than ${MAX_FILE_COUNT} files at once.`);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  return;
                }
                const combinedExisting = (attachedFiles || []).reduce((sum, f) => sum + (f.size || 0), 0);
                const combinedNew = selectedFiles.reduce((sum, f) => sum + f.size, 0);
                if (combinedExisting + combinedNew > MAX_COMBINED_SIZE) {
                  console.warn(`Combined file size exceeds ${(MAX_COMBINED_SIZE / 1024).toFixed(0)} KB limit.`);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  return;
                }
                const results = [];
                for (const file of selectedFiles) {
                  try {
                    const result = await readTextFile(file);
                    results.push(result);
                  } catch (err) {
                    console.warn(err.message);
                  }
                }
                if (results.length) {
                  setAttachedFiles((prev) => [...(prev || []), ...results]);
                }
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <button
              type="button"
              className="rei-touch-button"
              style={{ minWidth: "36px", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--border)", borderRadius: "8px" }}
              onClick={() => fileInputRef.current?.click()}
              title="Attach text/code files"
            >
              <Paperclip size={16} style={{ color: "var(--foreground-muted, #94a3b8)" }} />
            </button>
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
