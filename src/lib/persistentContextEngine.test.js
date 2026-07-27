import {
  scoreMessage,
  summarizeMessages,
  compressHCM,
  flattenHCM,
  saveChatHistoryHCM,
  readChatHistoryHCM
} from "./persistentContextEngine.js";

describe("Persistent Context Engine (HCM)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("scoreMessage", () => {
    it("assigns high score to initialization/welcome messages", () => {
      const msg = { sender: "rei", text: "System initialized. Welcome!" };
      expect(scoreMessage(msg)).toBe(100);
    });

    it("assigns high score to pinned or locked facts", () => {
      const msg = { sender: "user", text: "LOCKED: Never rewrite the user schema." };
      expect(scoreMessage(msg)).toBe(90);
    });

    it("assigns topic bonuses for architecture keywords", () => {
      const msg = { sender: "user", text: "Let's discuss the monolith architecture." };
      expect(scoreMessage(msg)).toBeGreaterThan(20);
    });

    it("handles null/undefined text gracefully", () => {
      const msgNoText = { sender: "user" };
      expect(() => scoreMessage(msgNoText)).not.toThrow();
      expect(scoreMessage(msgNoText)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("summarizeMessages", () => {
    it("summarizes empty list as null", () => {
      expect(summarizeMessages([])).toBe(null);
    });

    it("returns null for messages with no null input", () => {
      expect(summarizeMessages(null)).toBe(null);
    });

    it("creates topic-based summaries", () => {
      const messages = [
        { sender: "user", text: "Monolith design" },
        { sender: "rei", text: "Vibration sensors in pump maintenance" }
      ];
      const summary = summarizeMessages(messages);
      expect(summary).toContain("SaaS Monolith Architecture");
      expect(summary).toContain("Equipment Maintenance Decision");
    });

    it("counts decisions in summary", () => {
      const messages = [
        { sender: "user", text: "Here's my recommendation:" },
        { sender: "rei", text: "The verdict is clear." }
      ];
      const summary = summarizeMessages(messages);
      expect(summary).toContain("decisions analyzed");
      expect(summary).toContain("2 messages");
    });
  });

  describe("compressHCM", () => {
    it("compresses oldest messages when count exceeds threshold", () => {
      const welcome = { sender: "rei", text: "System initialized." };
      const hcm = {
        version: "hcm_v1",
        domainId: "assistant",
        coreIdentity: {},
        pinnedFacts: [],
        summarizedHistory: [],
        recentMessages: [
          welcome,
          { sender: "user", text: "Keep this PIN: user is active." },
          { sender: "rei", text: "Old message 1." },
          { sender: "user", text: "Old message 2." },
          { sender: "rei", text: "Recent message 1." },
          { sender: "user", text: "Recent message 2." }
        ]
      };

      const compressed = compressHCM(hcm, 2);
      expect(compressed.recentMessages.length).toBe(3); // welcome + last 2
      expect(compressed.pinnedFacts.length).toBe(1); // the PIN message
      expect(compressed.summarizedHistory.length).toBe(1); // summary created
      expect(compressed.summarizedHistory[0].text).toContain("[Summary]");
    });

    it("validates HCM structure before compression", () => {
      expect(() => compressHCM(null)).toThrow();
      expect(() => compressHCM({})).toThrow();
    });

    it("handles multiple compression cycles without data loss", () => {
      const welcome = { sender: "rei", text: "System initialized." };
      let hcm = {
        version: "hcm_v1",
        domainId: "coding",
        coreIdentity: {},
        pinnedFacts: [],
        summarizedHistory: [],
        recentMessages: [welcome, ...Array(15).fill(null).map((_, i) => ({
          sender: i % 2 === 0 ? "user" : "rei",
          text: `Message ${i}`
        }))]
      };

      // First compression
      hcm = compressHCM(hcm, 5);
      expect(hcm.recentMessages.length).toBeLessThanOrEqual(6);
      expect(hcm.summarizedHistory.length).toBeGreaterThan(0);

      // Second compression (cascade)
      const originalSummaryCount = hcm.summarizedHistory.length;
      hcm = compressHCM(hcm, 3);
      expect(hcm.recentMessages.length).toBeLessThanOrEqual(4);
      // Summary count should not decrease (summaries are preserved)
      expect(hcm.summarizedHistory.length).toBeGreaterThanOrEqual(originalSummaryCount);
    });
  });

  describe("flattenHCM", () => {
    it("correctly orders flattened structure", () => {
      const hcm = {
        version: "hcm_v1",
        domainId: "coding",
        pinnedFacts: [{ text: "Target database is Postgres." }],
        summarizedHistory: [{ sender: "rei", text: "[Summary] Monolith info.", isSummary: true }],
        recentMessages: [
          { sender: "rei", text: "Welcome coding." },
          { sender: "user", text: "Hello" }
        ]
      };

      const flat = flattenHCM(hcm);
      expect(flat[0].text).toBe("Welcome coding.");
      expect(flat[1].isPinnedFacts).toBe(true);
      expect(flat[2].text).toContain("[Summary] Monolith info.");
      expect(flat[3].text).toBe("Hello");
    });

    it("handles empty HCM gracefully", () => {
      expect(flattenHCM(null)).toEqual([]);
      expect(flattenHCM({})).toEqual([]);
    });

    it("separates UI concerns: pinned facts have no emoji", () => {
      const hcm = {
        pinnedFacts: [{ text: "Fact 1" }],
        summarizedHistory: [],
        recentMessages: [{ sender: "rei", text: "Welcome" }]
      };

      const flat = flattenHCM(hcm);
      const pinnedMessage = flat.find(m => m.isPinnedFacts);
      expect(pinnedMessage.text).not.toContain("📌");
      expect(pinnedMessage.isPinnedFacts).toBe(true);
    });
  });

  describe("integration with localStorage", () => {
    it("migrates raw arrays transparently", () => {
      const legacyArray = [
        { sender: "rei", text: "System initialized. Welcome to general." },
        { sender: "user", text: "Hi" }
      ];
      window.localStorage.setItem("rei_chat_history_assistant", JSON.stringify(legacyArray));

      const messages = readChatHistoryHCM("assistant", "Fallback initialization.");
      expect(messages.length).toBe(2);
      expect(messages[0].text).toContain("Welcome to general");
    });

    it("recovers gracefully from JSON corruption", () => {
      window.localStorage.setItem("rei_chat_history_assistant", "{corrupted raw text");
      const messages = readChatHistoryHCM("assistant", "Fallback initialization.");
      expect(messages[0].text).toBe("Fallback initialization.");
    });

    it("saves and loads HCM with compression", () => {
      const messages = [
        { sender: "rei", text: "Welcome" },
        ...Array(20).fill(null).map((_, i) => ({
          sender: i % 2 === 0 ? "user" : "rei",
          text: `Message ${i}`
        }))
      ];

      saveChatHistoryHCM("test", messages, 5);
      const loaded = readChatHistoryHCM("test", "Fallback");
      expect(loaded).not.toBeNull();
      expect(loaded.length).toBeGreaterThan(0);
    });

    it("validates domainId is required", () => {
      expect(() => saveChatHistoryHCM(null, [])).not.toThrow();
      expect(() => saveChatHistoryHCM("", [])).not.toThrow();
      expect(readChatHistoryHCM(null, "welcome")).toBe(null);
    });

    it("handles empty messages array gracefully", () => {
      expect(() => saveChatHistoryHCM("test", [])).not.toThrow();
      expect(() => saveChatHistoryHCM("test", undefined)).not.toThrow();
    });

    it("preserves pinned facts across compression cycles", () => {
      const messages = [
        { sender: "rei", text: "Welcome" },
        { sender: "user", text: "PIN: This is critical", pinned: true },
        ...Array(10).fill(null).map((_, i) => ({
          sender: "user",
          text: `Message ${i}`
        }))
      ];

      saveChatHistoryHCM("test", messages, 3);
      const loaded = readChatHistoryHCM("test", "Fallback");

      // Pinned facts should be in a separate system announcement
      const pinnedAnnouncementIndex = loaded.findIndex(m => m.isPinnedFacts);
      expect(pinnedAnnouncementIndex).toBeGreaterThan(-1);
    });
  });
});
