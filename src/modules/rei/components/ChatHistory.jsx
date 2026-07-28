import ChatBubble from "./ChatBubble.jsx";
import TypingPipeline from "./TypingPipeline.jsx";

export default function ChatHistory({ messages, selectedDomain, isTyping, chatEndRef, mobile, onCopy }) {
  return (
    <div className="rei-chat-container">
      <div className="rei-chat-history">
        {messages.map((msg, index) => (
          <ChatBubble key={index} msg={msg} selectedDomain={selectedDomain} mobile={mobile} onCopy={onCopy} />
        ))}

        {isTyping && <TypingPipeline />}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
