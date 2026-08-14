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

function main() {
  const text = fs.readFileSync(CSV, "utf8");
  const { header, rows } = parseCsv(text);

  const required = ["start_time_iso", "model", "type", "price", "amount"];
  for (const col of required) {
    if (!header.includes(col)) {
      console.error(`[verify:cache] FAIL: missing column '${col}' in ${CSV}`);
      process.exit(1);
    }
  }

  const forbidden = ["user_id", "api_key_name", "api_key", "wallet_type", "currency"];
  for (const col of forbidden) {
    if (header.includes(col)) {
      console.error(`[verify:cache] FAIL: private column '${col}' must not appear in ${CSV}`);
      process.exit(1);
    }
  }

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
        console.error(`[verify:cache] FAIL: no miss rate known for model '${r.model}'`);
        process.exit(1);
      }
      counterfactual += missRate * amount;
    } else if (type === "input_cache_miss_tokens" || type === "output_tokens") {
      counterfactual += Number(r.price) * amount;
    }
  }
  const savings = counterfactual - amountDerived;
  const savingsPct = counterfactual > 0 ? savings / counterfactual : 0;

  const results = {
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

  const crossCheckDelta = Math.abs(amountDerived - billedTotal);
  let failed = false;

  if (crossCheckDelta > 0.0001) {
    console.error(
      `[verify:cache] FAIL: amount-derived bill ${amountDerived.toFixed(4)} != billed total ${billedTotal.toFixed(4)} (delta ${crossCheckDelta.toFixed(6)})`
    );
    failed = true;
  }

  if (failed) {
    console.error("[verify:cache] FAIL: cache spend drift detected");
    process.exit(1);
  }

  console.log("[verify:cache] OK — data/cache-spend.csv verifies:");
  console.log(`  rows: ${results.rows}`);
  console.log(`  tokens: ${totalTokens.toLocaleString()} (hit ${hit.toLocaleString()} / miss ${miss.toLocaleString()} / output ${output.toLocaleString()})`);
  console.log(`  requests: ${requests.toLocaleString()}`);
  console.log(`  input cache hit rate: ${results.inputCacheHitRatePct}%`);
  console.log(`  amount-derived bill: $${results.amountDerivedBill} == billed total $${results.billedTotal}`);
  console.log(`  no-cache counterfactual: $${results.noCacheCounterfactual}`);
  console.log(`  savings: $${results.savings} (${results.savingsPct}%)`);
}

main();
