import { useEffect, useState } from "react";
import { verifyAll } from "../lib/claimGateway";
import { getClaimHistory } from "../lib/claimHistory";
import "../__eval__/claimRegistry";

const SEVERITY_META = {
  info: { label: "PASS", dot: "🟢", cls: "text-green-400 border-green-400/30 bg-green-400/5" },
  warn: { label: "WARN", dot: "🟡", cls: "text-amber-400 border-amber-400/30 bg-amber-400/5" },
  error: { label: "FAIL", dot: "🔴", cls: "text-red-400 border-red-400/30 bg-red-400/5" },
};

function formatTs(ts) {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return String(ts);
  }
}

function ClaimHistory({ claimId }) {
  const history = getClaimHistory(claimId);
  if (!history.length) {
    return <p className="mt-2 text-slate-500">No recorded history yet.</p>;
  }
  const recent = history.slice(-10).reverse();
  return (
    <div className="mt-2 space-y-1 border-t border-slate-700/40 pt-2">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">History (last {recent.length})</p>
      {recent.map((p) => (
        <div key={`${p.ts}`} className="flex items-center justify-between text-[11px] text-slate-400">
          <span>{formatTs(p.ts)}</span>
          <span
            className={`font-semibold ${
              p.severity === "info" ? "text-green-400" : p.severity === "warn" ? "text-amber-400" : "text-red-400"
            }`}
          >
            {p.severity.toUpperCase()}
          </span>
          <span className="tabular-nums">{p.value === null ? "—" : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function ClaimsGate({ className = "" }) {
  const [reports, setReports] = useState([]);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    setReports(verifyAll());
  }, []);

  const passed = reports.filter((r) => r.pass).length;

  const toggle = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
            const open = !!expanded[r.claimId];
            return (
              <li
                key={r.claimId}
                className={`rounded-lg border px-3 py-2 text-xs ${meta.cls}`}
                data-testid={`claim-${r.claimId}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(r.claimId)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={open}
                >
                  <span
                    className={`flex items-center gap-2 font-semibold ${r.pass ? "text-green-300" : "text-slate-200"}`}
                  >
                    <span aria-hidden>{meta.dot}</span>
                    {r.title}
                  </span>
                  <span className="tabular-nums text-slate-300 shrink-0">
                    {r.computed === null ? "—" : `${r.computed}`}
                    <span className="ml-2 text-[10px] text-slate-500">{open ? "▲" : "▼"}</span>
                  </span>
                </button>
                <p className="mt-1 text-slate-400 leading-snug">{r.reason}</p>
                {open && (
                  <div className="mt-2">
                    {r.source && (
                      <p className="text-[11px] text-slate-500">
                        <span className="uppercase tracking-wider">Source: </span>
                        <code className="text-slate-400">{r.source}</code>
                      </p>
                    )}
                    <ClaimHistory claimId={r.claimId} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default ClaimsGate;
