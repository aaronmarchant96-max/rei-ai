import { useEffect, useState } from "react";
import { verifyAll } from "../lib/claimGateway";
import "../__eval__/claimRegistry";

const SEVERITY_META = {
  info: { label: "PASS", dot: "🟢", cls: "text-green-400 border-green-400/30 bg-green-400/5" },
  warn: { label: "WARN", dot: "🟡", cls: "text-amber-400 border-amber-400/30 bg-amber-400/5" },
  error: { label: "FAIL", dot: "🔴", cls: "text-red-400 border-red-400/30 bg-red-400/5" },
};

function ClaimsGate({ className = "" }) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const next = verifyAll();
    setReports(next);
  }, []);

  const passed = reports.filter((r) => r.pass).length;

  return (
    <section
      className={`font-mono rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 ${className}`}
      aria-label="Claims Gate"
    >
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold tracking-widest text-slate-200">
          FEYNMAN GATE
        </h2>
        <span className="text-xs text-slate-400">
          {passed}/{reports.length || 0} claims passing
        </span>
      </header>

      {reports.length === 0 ? (
        <p className="text-xs text-slate-500">No claims registered yet.</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => {
            const meta = SEVERITY_META[r.severity] || SEVERITY_META.info;
            return (
              <li
                key={r.claimId}
                className={`rounded-lg border px-3 py-2 text-xs ${meta.cls}`}
                data-testid={`claim-${r.claimId}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`flex items-center gap-2 font-semibold ${r.pass ? "text-green-300" : "text-slate-200"}`}
                  >
                    <span aria-hidden>{meta.dot}</span>
                    {r.title}
                  </span>
                  <span className="tabular-nums text-slate-300 shrink-0">
                    {r.computed === null ? "—" : `${r.computed}`}
                  </span>
                </div>
                <p className="mt-1 text-slate-400 leading-snug">{r.reason}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default ClaimsGate;
