// Savings telemetry client for the ROADMAP Phase 3 cost-savings dashboard.
// Thin fetch wrapper around /api/savings. Reshapes the wire payload into the
// shape the Analytics UI consumes, and carries the evidence-integrity flag
// (savingsMode) so the UI never implies measured savings when telemetry is
// unavailable.

const toISODate = function (d) {
  return d.toISOString().slice(0, 10);
};

export async function fetchSavings({ tenant = "pilot", from, to } = {}) {
  const fromISO = from ? toISODate(from) : toISODate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const toISO = to ? toISODate(to) : toISODate(new Date());
  const params = new URLSearchParams({ tenant, from: fromISO, to: toISO });
  const res = await fetch(`/api/savings?${params.toString()}`, { cache: "no-store" });

  if (!res.ok) {
    // Reading the body as an error is enough; keep the caller on the honest
    // empty path rather than throwing a number into the UI.
    return {
      tenant,
      from: fromISO,
      to: toISO,
      requests: 0,
      totalSaved: 0,
      totalPremiumBaseline: 0,
      avgSavingsPercent: null,
      series: [],
      savingsMode: "empty-unavailable",
    };
  }

  const data = await res.json();
  const measured = data.savingsMode === "measured";
  return {
    tenant: data.tenant || tenant,
    from: data.from || fromISO,
    to: data.to || toISO,
    // When telemetry is not measured, zero the numbers so the UI can never
    // present a value that was not actually observed.
    requests: measured && typeof data.requests === "number" ? data.requests : 0,
    totalSaved: measured && typeof data.totalSaved === "number" ? data.totalSaved : 0,
    totalPremiumBaseline: measured && typeof data.totalPremiumBaseline === "number" ? data.totalPremiumBaseline : 0,
    avgSavingsPercent: measured && typeof data.avgSavingsPercent === "number" ? data.avgSavingsPercent : null,
    series: measured && Array.isArray(data.series) ? data.series : [],
    savingsMode: measured ? "measured" : "empty-unavailable",
  };
}
