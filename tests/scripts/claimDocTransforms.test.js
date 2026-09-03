import { renderLatestVerifiedFullSuite } from "../../scripts/claim-doc-transforms.js";

describe("claim documentation transforms", () => {
  const measurement = {
    testCount: 1364,
    suiteCount: 120,
    verificationDate: "2026-09-02",
  };

  it("does not create daily claim drift when measured totals are unchanged", () => {
    const existing =
      "Latest verified full-suite result (2026-09-01): **120/120 suites**, **1364/1364 tests**.";

    expect(renderLatestVerifiedFullSuite(existing, measurement)).toBe(existing);
  });

  it("refreshes the verification date when measured totals change", () => {
    const existing =
      "Latest verified full-suite result (2026-08-22): **119/119 suites**, **1350/1350 tests**.";

    expect(renderLatestVerifiedFullSuite(existing, measurement)).toBe(
      "Latest verified full-suite result (2026-09-02): **120/120 suites**, **1364/1364 tests**.",
    );
  });
});
