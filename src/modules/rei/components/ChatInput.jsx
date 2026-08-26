import { useRef, useState, useEffect } from "react";
import { Paperclip, X } from "lucide-react";
import { useRei } from "../ReiContext.js";
import { readTextFile, MAX_FILE_SIZE, MAX_FILE_COUNT, MAX_COMBINED_SIZE } from "../../../lib/fileExtractor.js";

export default function ChatInput() {
  const { inputMessage, setInputMessage, selectedDomain, handleSendMessage, inputRef, mobile, generalistPrompts, assistantPromptIndex, setAssistantPromptIndex, attachedFiles, setAttachedFiles } = useRei();
  const fileInputRef = useRef(null);
  const [fileErrors, setFileErrors] = useState([]);

  // Desktop-only autofocus: Never autofocus on mobile to prevent virtual keyboard from occluding the zero-state view
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768 && inputRef?.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  return (
    <div className={`rei-input-shell ${mobile ? "is-mobile" : ""}`}>
      <div className="rei-input-shell__inner">

        {attachedFiles && attachedFiles.length > 0 && (
          <div className="rei-attachment-list">
            {attachedFiles.map((f, i) => (
              <span
                key={i}
                className="rei-attachment-chip"
              >
                <span className="rei-attachment-chip__name">{f.name}</span>
                <X
                  size={12}
                  className="rei-attachment-chip__remove"
                  onClick={() => {
                    setAttachedFiles((prev) => prev.filter((_, j) => j !== i));
                    setFileErrors([]);
                  }}
                />
              </span>
            ))}
          </div>
        )}

        {fileErrors.length > 0 && (
          <div className="rei-input-errors">
            {fileErrors.map((msg, i) => (
              <div key={i} className="rei-input-error">
                {msg}
              </div>
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
                setFileErrors([]);
                const selectedFiles = Array.from(e.target.files || []);
                if (attachedFiles.length + selectedFiles.length > MAX_FILE_COUNT) {
                  setFileErrors([`Cannot attach more than ${MAX_FILE_COUNT} files at once.`]);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  return;
                }
                const combinedExisting = (attachedFiles || []).reduce((sum, f) => sum + (f.size || 0), 0);
                const combinedNew = selectedFiles.reduce((sum, f) => sum + f.size, 0);
                if (combinedExisting + combinedNew > MAX_COMBINED_SIZE) {
                  setFileErrors([`Combined file size exceeds ${(MAX_COMBINED_SIZE / 1024).toFixed(0)} KB limit.`]);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  return;
                }
                const results = [];
                const errors = [];
                for (const file of selectedFiles) {
                  try {
                    const result = await readTextFile(file);
                    results.push(result);
                  } catch (err) {
                    errors.push(err.message);
                  }
                }
                if (errors.length) setFileErrors(errors);
                if (results.length) {
                  setAttachedFiles((prev) => [...(prev || []), ...results]);
                }
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <button
              type="button"
              className="rei-clip-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach text/code files (up to 4 files, max 500KB each)"
              aria-label="Attach text/code files"
            >
              <Paperclip size={16} />
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
                mobile
                  ? "Ask REI.ai…"
                  : selectedDomain === "coding"
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
            <button type="submit" className="rei-touch-button rei-touch-button--send">
              Send
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
