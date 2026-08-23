import { parseArgs, validateArgs, isValidDate, inRange, computeFromRows, measuredRange, main, CSV } from "../../scripts/verify-cache-spend.mjs";

const HIT_RATE = 97.3502;

describe("verify-cache-spend — CLI acceptance contract", () => {
  describe("parseArgs — option parsing", () => {
    test.each([
      [[], { from: null, to: null, model: null, json: false, breakdown: false, help: false }],
      [["--from", "2026-07-20"], { from: "2026-07-20", to: null, model: null, json: false, breakdown: false, help: false }],
      [["--to", "2026-08-14"], { from: null, to: "2026-08-14", model: null, json: false, breakdown: false, help: false }],
      [["--model", "deepseek-v4-pro"], { from: null, to: null, model: "deepseek-v4-pro", json: false, breakdown: false, help: false }],
      [["--json"], { from: null, to: null, model: null, json: true, breakdown: false, help: false }],
      [["--breakdown"], { from: null, to: null, model: null, json: false, breakdown: true, help: false }],
      [["--help"], { from: null, to: null, model: null, json: false, breakdown: false, help: true }],
    ])("parses %o", (argv, expected) => {
      expect(parseArgs(argv)).toEqual(expected);
    });

    it("rejects unknown options", () => {
      expect(() => parseArgs(["--wat"])).toThrow(/unknown option '--wat'/);
    });

    test.each([
      [["--from"], "--from"],
      [["--to"], "--to"],
      [["--model"], "--model"],
    ])("requires a value after %s", (argv, flag) => {
      expect(() => parseArgs(argv)).toThrow(new RegExp(`${flag}.*requires a value`));
    });
  });

  describe("validateArgs — argument validation", () => {
    it("accepts a valid range", () => {
      expect(() => validateArgs({ from: "2026-07-20", to: "2026-08-14", model: null })).not.toThrow();
    });

    it("rejects a malformed date", () => {
      expect(() => validateArgs({ from: "2026-13-45", to: null, model: null })).toThrow(/--from must be a valid YYYY-MM-DD/);
    });

    it("rejects a nonexistent calendar date", () => {
      expect(() => validateArgs({ from: "2026-02-30", to: null, model: null })).toThrow(/--from must be a valid YYYY-MM-DD/);
    });

    it("rejects reversed dates", () => {
      expect(() => validateArgs({ from: "2026-08-14", to: "2026-07-20", model: null })).toThrow(/--from '2026-08-14' is after --to '2026-07-20'/);
    });

    it("rejects an unknown model", () => {
      expect(() => validateArgs({ from: null, to: null, model: "nope" })).toThrow(/unknown model 'nope'/);
    });

    it("accepts a known model", () => {
      expect(() => validateArgs({ from: null, to: null, model: "deepseek-v4-flash" })).not.toThrow();
    });
  });

  describe("isValidDate — calendar date validation", () => {
    test.each([
      ["2026-07-20", true],
      ["2026-02-28", true],
      ["2024-02-29", true], // leap year
      ["2026-02-30", false],
      ["2026-13-01", false],
      ["2026-00-10", false],
      ["2026-07-45", false],
      ["07-20-2026", false],
      ["2026/07/20", false],
      ["20260720", false],
    ])("%s → %s", (value, expected) => {
      expect(isValidDate(value)).toBe(expected);
    });
  });

  describe("inRange — date filtering", () => {
    it("includes everything when no range is given", () => {
      expect(inRange("2026-07-20", null, null)).toBe(true);
    });

    test.each([
      ["2026-07-20", "2026-07-20", "2026-07-31", true],
      ["2026-07-31", "2026-07-20", "2026-07-31", true],
      ["2026-07-19", "2026-07-20", "2026-07-31", false],
      ["2026-08-01", "2026-07-20", "2026-07-31", false],
      ["2026-08-01", "2026-08-01", null, true],
      ["2026-07-31", null, "2026-07-31", true],
      ["2026-08-01", null, "2026-07-31", false],
    ])("bounds %s within %s..%s → %s", (date, from, to, expected) => {
      expect(inRange(date, from, to)).toBe(expected);
    });
  });

  describe("measuredRange — dataset range", () => {
    it("reports min/max dates", () => {
      const rows = [
        { start_time_iso: "2026-08-01T00:00:00-06:00" },
        { start_time_iso: "2026-07-20T00:00:00-06:00" },
      ];
      expect(measuredRange(rows)).toEqual({ from: "2026-07-20", to: "2026-08-01" });
    });

    it("returns nulls for empty input", () => {
      expect(measuredRange([])).toEqual({ from: null, to: null });
    });
  });

  describe("main — CLI execution contract", () => {
    it("default invocation reproduces the measured 97.3502% hit rate", () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      try {
        main([]);
        const calls = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
        expect(calls).toMatch(/input cache hit rate: 97\.3502%/);
        expect(calls).toContain("savings: $567.0575 (96%)");
      } finally {
        logSpy.mockRestore();
        errSpy.mockRestore();
      }
    });

    it("--from missing value exits 2 with usage error", () => {
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      try {
        main(["--from"]);
        expect(process.exitCode).toBe(2);
        expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/--from.*requires a value/));
      } finally {
        errSpy.mockRestore();
        process.exitCode = 0;
      }
    });

    it("--wat exits 2 with usage error", () => {
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      try {
        main(["--wat"]);
        expect(process.exitCode).toBe(2);
        expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/unknown option '--wat'/));
      } finally {
        errSpy.mockRestore();
        process.exitCode = 0;
      }
    });

    it("reversed dates exit 2 with usage error", () => {
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      try {
        main(["--from", "2026-08-14", "--to", "2026-07-20"]);
        expect(process.exitCode).toBe(2);
        expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/is after --to/));
      } finally {
        errSpy.mockRestore();
        process.exitCode = 0;
      }
    });

    it("unknown model exits 2 with usage error", () => {
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      try {
        main(["--model", "nope"]);
        expect(process.exitCode).toBe(2);
        expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/unknown model 'nope'/));
      } finally {
        errSpy.mockRestore();
        process.exitCode = 0;
      }
    });

    it("valid filter to a nonempty range exits 0", () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      try {
        main(["--from", "2026-07-20", "--to", "2026-07-31"]);
        expect(process.exitCode).toBe(0);
        expect(errSpy).not.toHaveBeenCalled();
      } finally {
        logSpy.mockRestore();
        errSpy.mockRestore();
      }
    });

    it("valid date filter with no matching rows exits 1", () => {
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      try {
        main(["--from", "2026-09-01", "--to", "2026-09-30"]);
        expect(process.exitCode).toBe(1);
        expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/no rows match/));
      } finally {
        errSpy.mockRestore();
        process.exitCode = 0;
      }
    });

    it("--json emits the full measured 97.3502% hit rate", () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      try {
        main(["--json"]);
        const payload = JSON.parse(logSpy.mock.calls[0][0]);
        expect(payload.results.inputCacheHitRatePct).toBe(HIT_RATE);
        expect(payload.results.savingsPct).toBe(96);
        expect(payload.provenance.source).toBe("deepseek-billing-export");
        expect(payload.provenance.measured_range).toEqual({ from: "2026-07-20", to: "2026-08-14" });
        expect(payload.models).toEqual(["deepseek-v4-flash", "deepseek-v4-pro"]);
      } finally {
        logSpy.mockRestore();
        errSpy.mockRestore();
      }
    });
  });
});