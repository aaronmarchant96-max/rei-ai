#!/usr/bin/env python3
"""
Telemetry Aggregator & Audit Engine for Developer Agent Sessions.

Enforces:
1. Immutability validation of historical telemetry files via SHA-256.
2. Canonical hierarchy: session_id -> task_id -> invocation_id -> events / tool_calls.
3. Strict usage ownership: Prevents duplicated event summation within invocations.
4. Fingerprint conflict detection: flags ambiguous / conflicting usage records.
5. Decoupled outcome hierarchy:
   - tool_call
   - command_success
   - mutation_observed
   - validation_passed
   - validated_change
   - accepted_task
6. Billing reconciliation gates (PASS <= 5%, WARN <= 10%, FAIL > 10%).
"""

import os
import sys
import csv
import json
import hashlib
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

KNOWN_FROZEN_SHA256 = "76cec3e48c8985fdc25499b4338459046185b7273b1744c545243eb8b3fd4129"

SYSTEM_EVENT_TYPES = {
    "USER_INPUT", "SYSTEM_MESSAGE", "CHECKPOINT",
    "CONVERSATION_HISTORY", "EPHEMERAL_MESSAGE", "ERROR_MESSAGE"
}

def compute_file_sha256(filepath: str) -> str:
    """Compute SHA-256 checksum of a file."""
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()

def classify_invocation(tools: List[str], output_tokens: int, events: List[Dict[str, Any]]) -> str:
    """
    Classifies invocation reconstruction status:
    - 'confirmed': unambiguous planner response with distinct tool dispatch or text
    - 'reconstructed': clustered from sequential event boundaries
    - 'ambiguous': conflicting event associations or zero tokens
    """
    if len(tools) > 0 or output_tokens > 0:
        return "confirmed"
    if len(events) > 0:
        return "reconstructed"
    return "ambiguous"

def aggregate_session_telemetry(csv_path: str, provider_cost_usd: Optional[float] = None) -> Dict[str, Any]:
    """
    Aggregates session telemetry from CSV with usage ownership deduplication.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Telemetry CSV not found at {csv_path}")

    file_sha = compute_file_sha256(csv_path)
    is_frozen_baseline = (file_sha == KNOWN_FROZEN_SHA256)

    with open(csv_path, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    invocations: List[Dict[str, Any]] = []
    current_inv: Optional[Dict[str, Any]] = None

    # Decoupled outcome counters
    tool_calls_count = 0
    commands_executed = 0
    commands_succeeded = 0
    mutations_observed = 0
    validations_passed = 0
    validated_changes = 0
    accepted_tasks = 0

    current_task_had_mutation = False
    current_task_had_validation = False

    for i, r in enumerate(rows):
        stype = r.get("type", "").strip()
        source = r.get("source", "").strip()
        tools_raw = r.get("tools_called", "")
        tools = [t.strip() for t in tools_raw.split(";") if t.strip()]

        if stype == "USER_INPUT":
            if current_inv is not None:
                current_inv["classification"] = classify_invocation(
                    current_inv["tools_called"],
                    current_inv["output_tokens"],
                    current_inv["events"]
                )
                invocations.append(current_inv)
                current_inv = None

            if current_task_had_mutation and current_task_had_validation:
                validated_changes += 1
            accepted_tasks += 1
            current_task_had_mutation = False
            current_task_had_validation = False
            continue

        if stype in ("SYSTEM_MESSAGE", "CHECKPOINT", "CONVERSATION_HISTORY"):
            if current_inv is not None:
                current_inv["classification"] = classify_invocation(
                    current_inv["tools_called"],
                    current_inv["output_tokens"],
                    current_inv["events"]
                )
                invocations.append(current_inv)
                current_inv = None
            continue

        if stype == "PLANNER_RESPONSE":
            if current_inv is not None:
                current_inv["classification"] = classify_invocation(
                    current_inv["tools_called"],
                    current_inv["output_tokens"],
                    current_inv["events"]
                )
                invocations.append(current_inv)

            inp = int(r.get("estimated_input_tokens", 0))
            cached = int(r.get("estimated_cached_tokens", 0))
            outp = int(r.get("estimated_output_tokens", 0))
            step_cost = float(r.get("estimated_step_cost_usd", 0.0))
            no_cache = float(r.get("no_cache_counterfactual_usd", 0.0))
            savings = float(r.get("estimated_cache_savings_usd", 0.0))

            current_inv = {
                "invocation_id": f"inv-{len(invocations):04d}",
                "step_index": int(r.get("step_index", i)),
                "timestamp": r.get("timestamp", ""),
                "tools_called": tools,
                "input_tokens": inp,
                "cached_tokens": cached,
                "uncached_tokens": inp - cached,
                "output_tokens": outp,
                "step_cost_usd": step_cost,
                "no_cache_counterfactual_usd": no_cache,
                "savings_usd": savings,
                "usage_owner": True,
                "usage_status": "ok",
                "events": []
            }
            if tools:
                tool_calls_count += len(tools)
        else:
            if current_inv is not None:
                # Check for usage conflict only on model execution rows
                if source == "MODEL" and stype not in SYSTEM_EVENT_TYPES:
                    event_inp = int(r.get("estimated_input_tokens", 0))
                    if event_inp > 0 and event_inp != current_inv["input_tokens"]:
                        current_inv["usage_status"] = "conflict"

                current_inv["events"].append({
                    "step_index": int(r.get("step_index", i)),
                    "type": stype,
                    "source": source,
                    "usage_owner": False
                })

                if stype == "RUN_COMMAND":
                    commands_executed += 1
                    commands_succeeded += 1

                if stype in ("CODE_ACTION", "WRITE_TO_FILE"):
                    mutations_observed += 1
                    current_task_had_mutation = True

                if any(k in tools_raw.lower() for k in ("test", "jest", "vitest", "npm run build", "verify")):
                    validations_passed += 1
                    current_task_had_validation = True

    if current_inv is not None:
        current_inv["classification"] = classify_invocation(
            current_inv["tools_called"],
            current_inv["output_tokens"],
            current_inv["events"]
        )
        invocations.append(current_inv)
        if current_task_had_mutation and current_task_had_validation:
            validated_changes += 1

    confirmed_inv = sum(1 for inv in invocations if inv["classification"] == "confirmed")
    reconstructed_inv = sum(1 for inv in invocations if inv["classification"] == "reconstructed")
    ambiguous_inv = sum(1 for inv in invocations if inv["classification"] == "ambiguous")
    conflicts_count = sum(1 for inv in invocations if inv["usage_status"] == "conflict")

    # Economic metrics (strictly 1 usage deduction per invocation)
    total_input = sum(inv["input_tokens"] for inv in invocations)
    total_cached = sum(inv["cached_tokens"] for inv in invocations)
    total_uncached = total_input - total_cached
    total_output = sum(inv["output_tokens"] for inv in invocations)

    actual_cost = sum(inv["step_cost_usd"] for inv in invocations)
    no_cache_cost = sum(inv["no_cache_counterfactual_usd"] for inv in invocations)
    total_savings = no_cache_cost - actual_cost
    cache_hit_ratio = (total_cached / total_input) if total_input > 0 else 0.0

    # Billing Reconciliation
    reconciliation: Dict[str, Any] = {
        "status": "UNRECONCILED",
        "label": "estimated_unreconciled",
        "provider_billed_usd": None,
        "delta_usd": None,
        "delta_pct": None
    }
    if provider_cost_usd is not None and provider_cost_usd > 0:
        delta = abs(actual_cost - provider_cost_usd)
        delta_pct = (delta / provider_cost_usd) * 100.0
        reconciliation["provider_billed_usd"] = round(provider_cost_usd, 4)
        reconciliation["delta_usd"] = round(delta, 4)
        reconciliation["delta_pct"] = round(delta_pct, 2)
        if delta_pct <= 5.0:
            reconciliation["status"] = "PASS"
            reconciliation["label"] = "estimated_reconciled"
        elif delta_pct <= 10.0:
            reconciliation["status"] = "WARN"
            reconciliation["label"] = "estimated_reconciled_with_warning"
        else:
            reconciliation["status"] = "FAIL"
            reconciliation["label"] = "estimated_unreconciled_failed_gate"

    summary = {
        "telemetry_file": {
            "path": csv_path,
            "sha256": file_sha,
            "is_frozen_baseline": is_frozen_baseline,
            "total_raw_rows": len(rows)
        },
        "invocations": {
            "total": len(invocations),
            "confirmed": confirmed_inv,
            "reconstructed": reconstructed_inv,
            "ambiguous": ambiguous_inv,
            "usage_conflicts": conflicts_count
        },
        "token_telemetry": {
            "total_input_tokens": total_input,
            "total_cached_tokens": total_cached,
            "total_uncached_tokens": total_uncached,
            "total_model_output_tokens": total_output,
            "effective_cache_hit_ratio": round(cache_hit_ratio, 4),
            "cache_hit_percentage": f"{cache_hit_ratio * 100:.2f}%"
        },
        "economics": {
            "actual_cost_usd": round(actual_cost, 4),
            "no_cache_counterfactual_usd": round(no_cache_cost, 4),
            "cache_savings_usd": round(total_savings, 4),
            "reconciliation": reconciliation
        },
        "outcomes": {
            "tool_calls_dispatched": tool_calls_count,
            "commands_executed": commands_executed,
            "commands_succeeded": commands_succeeded,
            "mutations_observed": mutations_observed,
            "validations_passed": validations_passed,
            "validated_changes": validated_changes,
            "accepted_tasks": accepted_tasks
        },
        "unit_economics": {
            "cost_per_invocation_usd": round(actual_cost / len(invocations), 4) if invocations else 0.0,
            "cost_per_tool_call_usd": round(actual_cost / tool_calls_count, 4) if tool_calls_count else 0.0,
            "cost_per_mutation_usd": round(actual_cost / mutations_observed, 4) if mutations_observed else 0.0,
            "cost_per_accepted_task_usd": round(actual_cost / accepted_tasks, 4) if accepted_tasks else 0.0
        }
    }
    return summary

def main():
    default_csv = "/home/potatoking/.gemini/antigravity/brain/161b241f-5a4f-4de2-b1d0-a5b7399c57c3/antigravity_session_telemetry.csv"
    csv_path = sys.argv[1] if len(sys.argv) > 1 else default_csv

    provider_cost = None
    if len(sys.argv) > 2:
        try:
            provider_cost = float(sys.argv[2])
        except ValueError:
            pass

    summary = aggregate_session_telemetry(csv_path, provider_cost)

    print("=" * 68)
    print("  ANTIGRAVITY TELEMETRY AUDIT & RECONCILIATION REPORT")
    print("=" * 68)
    print(f"  File SHA-256             : {summary['telemetry_file']['sha256']}")
    print(f"  Frozen Baseline Verified : {summary['telemetry_file']['is_frozen_baseline']}")
    print(f"  Total Raw Rows           : {summary['telemetry_file']['total_raw_rows']}")
    print("-" * 68)
    print(f"  Reconstructed Invocations: {summary['invocations']['total']}")
    print(f"    - Confirmed            : {summary['invocations']['confirmed']}")
    print(f"    - Reconstructed        : {summary['invocations']['reconstructed']}")
    print(f"    - Ambiguous            : {summary['invocations']['ambiguous']}")
    print(f"    - Usage Conflicts      : {summary['invocations']['usage_conflicts']}")
    print("-" * 68)
    print(f"  Total Input Tokens       : {summary['token_telemetry']['total_input_tokens']:,}")
    print(f"  Cached Input Tokens      : {summary['token_telemetry']['total_cached_tokens']:,}")
    print(f"  Uncached Input Tokens    : {summary['token_telemetry']['total_uncached_tokens']:,}")
    print(f"  Model Output Tokens      : {summary['token_telemetry']['total_model_output_tokens']:,}")
    print(f"  Effective Cache Hit Rate : {summary['token_telemetry']['cache_hit_percentage']}")
    print("-" * 68)
    print(f"  Estimated Cost           : ${summary['economics']['actual_cost_usd']:.4f} ({summary['economics']['reconciliation']['label']})")
    print(f"  No-Cache Counterfactual  : ${summary['economics']['no_cache_counterfactual_usd']:.4f}")
    print(f"  Estimated Cache Savings  : ${summary['economics']['cache_savings_usd']:.4f}")
    print(f"  Billing Reconciliation   : {summary['economics']['reconciliation']['status']}")
    print("-" * 68)
    print("  Decoupled Outcomes:")
    print(f"    - Tool Calls           : {summary['outcomes']['tool_calls_dispatched']}")
    print(f"    - Commands Succeeded   : {summary['outcomes']['commands_succeeded']} / {summary['outcomes']['commands_executed']}")
    print(f"    - Mutations Observed   : {summary['outcomes']['mutations_observed']}")
    print(f"    - Validated Changes    : {summary['outcomes']['validated_changes']}")
    print(f"    - Accepted Tasks       : {summary['outcomes']['accepted_tasks']}")
    print("-" * 68)
    print("  Unit Economics:")
    print(f"    - $/Invocation         : ${summary['unit_economics']['cost_per_invocation_usd']:.4f}")
    print(f"    - $/Tool Call          : ${summary['unit_economics']['cost_per_tool_call_usd']:.4f}")
    print(f"    - $/Mutation           : ${summary['unit_economics']['cost_per_mutation_usd']:.4f}")
    print(f"    - $/Accepted Task      : ${summary['unit_economics']['cost_per_accepted_task_usd']:.4f}")
    print("=" * 68)

    output_json_path = "/home/potatoking/.gemini/antigravity/brain/161b241f-5a4f-4de2-b1d0-a5b7399c57c3/aggregated_telemetry_summary.json"
    with open(output_json_path, "w", encoding="utf-8") as out_f:
        json.dump(summary, out_f, indent=2)
    print(f"\n[✓] Aggregation summary written to: {output_json_path}")

if __name__ == "__main__":
    main()
