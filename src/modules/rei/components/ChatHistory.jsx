import ChatBubble from "./ChatBubble.jsx";

export default function ChatHistory({ messages, selectedDomain, isTyping, chatEndRef, mobile, onCopy }) {
  return (
    <div className="rei-chat-container">
      <div className="rei-chat-history">
        {messages.map((msg, index) => (
          <ChatBubble key={index} msg={msg} selectedDomain={selectedDomain} mobile={mobile} onCopy={onCopy} />
        ))}

        {isTyping && (
          <div style={{
            alignSelf: "flex-start",
            color: "#FFB300",
            fontFamily: "inherit",
            fontSize: "1.02em",
            animation: "pulse 1.5s ease-in-out infinite",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>●</span>
            <span>REI is shaping the reply...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
