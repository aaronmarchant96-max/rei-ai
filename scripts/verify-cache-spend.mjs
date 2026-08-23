#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.join(__dirname, "..", "data", "cache-spend.csv");

const TOKEN_TYPES = new Set([
  "input_cache_hit_tokens",
  "input_cache_miss_tokens",
  "output_tokens",
]);

function parseCsv(text) {
  const rows = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim() !== "");
  const header = lines[0].split(",");
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const row = {};
    header.forEach((h, idx) => {
      row[h] = (cells[idx] || "").trim();
    });
    rows.push(row);
  }
  return { header, rows };
}

const BILLED_TYPES = new Set([...TOKEN_TYPES]);
const MISS_RATE = {
  "deepseek-v4-pro": 0.000000435,
  "deepseek-v4-flash": 0.00000014,
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseArgs(argv) {
  const args = { from: null, to: null, model: null, json: false, breakdown: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") {
      args.json = true;
    } else if (a === "--breakdown") {
      args.breakdown = true;
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    } else if (a === "--from" || a === "--to" || a === "--model") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`[verify:cache] USAGE: option '${a}' requires a value`);
      }
      if (a === "--from") args.from = value;
      else if (a === "--to") args.to = value;
      else args.model = value;
      i += 1;
    } else {
      throw new Error(`[verify:cache] USAGE: unknown option '${a}'`);
    }
  }
  return args;
}

function isValidDate(value) {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function validateArgs(args) {
  for (const [name, value] of [["--from", args.from], ["--to", args.to]]) {
    if (value !== null && !isValidDate(value)) {
      throw new Error(`[verify:cache] USAGE: ${name} must be a valid YYYY-MM-DD date, got '${value}'`);
    }
  }
  if (args.from !== null && args.to !== null && args.from > args.to) {
    throw new Error(`[verify:cache] USAGE: --from '${args.from}' is after --to '${args.to}'`);
  }
  if (args.model !== null && !Object.prototype.hasOwnProperty.call(MISS_RATE, args.model)) {
    throw new Error(`[verify:cache] USAGE: unknown model '${args.model}' (known: ${Object.keys(MISS_RATE).join(", ")})`);
  }
}

function inRange(dateStr, from, to) {
  if (!from && !to) return true;
  const d = String(dateStr).slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function computeFromRows(rows) {
  let hit = 0;
  let miss = 0;
  let output = 0;
  let requests = 0;
  let amountDerived = 0;
  let billedTotal = 0;

  for (const r of rows) {
    const type = r.type;
    const amount = Number(r.amount);
    const price = r.price === "" ? null : Number(r.price);
    if (type === "input_cache_hit_tokens") hit += amount;
    else if (type === "input_cache_miss_tokens") miss += amount;
    else if (type === "output_tokens") output += amount;
    else if (type === "request_count") requests += amount;
    else if (type === "billed_cost") {
      billedTotal += amount;
      continue;
    }
    if (TOKEN_TYPES.has(type) && price !== null) {
      amountDerived += price * amount;
    }
  }

  const totalTokens = hit + miss + output;
  const hitRate = hit + miss > 0 ? hit / (hit + miss) : 0;

  let counterfactual = 0;
  for (const r of rows) {
    const type = r.type;
    const amount = Number(r.amount);
    if (type === "input_cache_hit_tokens") {
      const missRate = MISS_RATE[r.model];
      if (missRate === undefined) {
        throw new Error(`[verify:cache] FAIL: no miss rate known for model '${r.model}'`);
      }
      counterfactual += missRate * amount;
    } else if (type === "input_cache_miss_tokens" || type === "output_tokens") {
      counterfactual += Number(r.price) * amount;
    }
  }
  const savings = counterfactual - amountDerived;
  const savingsPct = counterfactual > 0 ? savings / counterfactual : 0;

  return {
    rows: rows.length,
    tokens: { hit, miss, output, total: totalTokens },
    requests,
    amountDerivedBill: Number(amountDerived.toFixed(4)),
    billedTotal: Number(billedTotal.toFixed(4)),
    inputCacheHitRatePct: Number((hitRate * 100).toFixed(4)),
    noCacheCounterfactual: Number(counterfactual.toFixed(4)),
    savings: Number(savings.toFixed(4)),
    savingsPct: Number((savingsPct * 100).toFixed(1)),
  };
}

function measuredRange(rows) {
  const dates = rows.map((r) => String(r.start_time_iso).slice(0, 10)).filter(Boolean).sort();
  if (dates.length === 0) return { from: null, to: null };
  return { from: dates[0], to: dates[dates.length - 1] };
}

function printHelp() {
  console.log(`[verify:cache] usage: node scripts/verify-cache-spend.mjs [options]

Reads data/cache-spend.csv (DeepSeek billing export) and verifies the
derived bill against the billed total, then reports cache economics.

Options:
  --from <YYYY-MM-DD>   only include rows on/after this date
  --to <YYYY-MM-DD>     only include rows on/before this date
  --model <name>        only include this model (deepseek-v4-pro | deepseek-v4-flash)
  --breakdown           print a per-model breakdown
  --json                emit machine-readable JSON (schema rei.verify-cache-spend/v1)
  --help, -h            show this help

Backward compatibility: invoking with no options reproduces the original
verification output (rows, tokens, hit rate, bill cross-check, counterfactual,
savings) plus two informational lines (range and provenance).`);
}

function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
    validateArgs(args);
  } catch (err) {
    console.error(err.message);
    console.error('[verify:cache] USAGE: run with --help for usage');
    process.exitCode = 2;
    return;
  }

  if (args.help) {
    printHelp();
    return;
  }

  let text;
  try {
    text = fs.readFileSync(CSV, "utf8");
  } catch (err) {
    console.error(`[verify:cache] FAIL: cannot read ${CSV}: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  const { header, rows } = parseCsv(text);

  const required = ["start_time_iso", "model", "type", "price", "amount"];
  for (const col of required) {
    if (!header.includes(col)) {
      console.error(`[verify:cache] FAIL: missing column '${col}' in ${CSV}`);
      process.exitCode = 1;
      return;
    }
  }

  const forbidden = ["user_id", "api_key_name", "api_key", "wallet_type", "currency"];
  for (const col of forbidden) {
    if (header.includes(col)) {
      console.error(`[verify:cache] FAIL: private column '${col}' must not appear in ${CSV}`);
      process.exitCode = 1;
      return;
    }
  }

  const filtered = rows.filter(
    (r) => inRange(r.start_time_iso, args.from, args.to) && (!args.model || r.model === args.model)
  );

  if (filtered.length === 0) {
    console.error("[verify:cache] FAIL: no rows match the given --from/--to/--model filter");
    process.exitCode = 1;
    return;
  }

  let results;
  let breakdown = null;
  try {
    results = computeFromRows(filtered);
    const models = [...new Set(filtered.map((r) => r.model))].sort();
    if (args.breakdown || args.json) {
      breakdown = models.map((m) => ({
        model: m,
        ...computeFromRows(filtered.filter((r) => r.model === m)),
        miss_rate: MISS_RATE[m],
      }));
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
    return;
  }

  const range = measuredRange(filtered);
  const models = [...new Set(filtered.map((r) => r.model))].sort();

  const provenance = {
    provider: "deepseek",
    source: "deepseek-billing-export",
    attribution_note: "models, token classes, prices, and amounts only; does not identify the generating client",
    measured_range: range,
  };

  const crossCheckDelta = Math.abs(results.amountDerivedBill - results.billedTotal);

  if (crossCheckDelta > 0.0001) {
    console.error(
      `[verify:cache] FAIL: amount-derived bill ${results.amountDerivedBill.toFixed(4)} != billed total ${results.billedTotal.toFixed(4)} (delta ${crossCheckDelta.toFixed(6)})`
    );
    console.error("[verify:cache] FAIL: cache spend drift detected");
    process.exitCode = 1;
    return;
  }

  if (args.json) {
    const payload = {
      schema: "rei.verify-cache-spend/v1",
      filter: { from: args.from, to: args.to, model: args.model },
      provenance,
      models,
      results,
      breakdown,
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log("[verify:cache] OK — data/cache-spend.csv verifies:");
  console.log(`  rows: ${results.rows}`);
  console.log(`  range: ${range.from} → ${range.to} (${models.join(", ")})`);
  console.log(`  tokens: ${results.tokens.total.toLocaleString()} (hit ${results.tokens.hit.toLocaleString()} / miss ${results.tokens.miss.toLocaleString()} / output ${results.tokens.output.toLocaleString()})`);
  console.log(`  requests: ${results.requests.toLocaleString()}`);
  console.log(`  input cache hit rate: ${results.inputCacheHitRatePct}%`);
  console.log(`  amount-derived bill: $${results.amountDerivedBill} == billed total $${results.billedTotal}`);
  console.log(`  no-cache counterfactual: $${results.noCacheCounterfactual}`);
  console.log(`  savings: $${results.savings} (${results.savingsPct}%)`);
  console.log(`  provenance: ${provenance.source} (${provenance.attribution_note})`);
  if (breakdown) {
    console.log("  breakdown:");
    for (const b of breakdown) {
      console.log(`    ${b.model}: hit rate ${b.inputCacheHitRatePct}% — hit ${b.tokens.hit.toLocaleString()} / miss ${b.tokens.miss.toLocaleString()} — $${b.amountDerivedBill} derived vs $${b.noCacheCounterfactual} counterfactual (${b.savingsPct}%)`);
    }
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main();
}

export { parseArgs, validateArgs, isValidDate, inRange, computeFromRows, measuredRange, main, CSV };