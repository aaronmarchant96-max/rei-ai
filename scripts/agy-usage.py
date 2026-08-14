#!/usr/bin/env python3
"""
Antigravity (AGY) Local Quota & Usage Monitor
Audits hourly, daily, weekly, and monthly model turns and token estimates across all sessions.
"""

import os
import sys
import json
import time
from datetime import datetime, timezone

def analyze_antigravity_usage():
    brain_dir = os.path.expanduser("~/.gemini/antigravity/brain")
    now = time.time()

    hour_turns = 0
    day_turns = 0
    week_turns = 0
    month_turns = 0
    total_turns = 0
    total_tool_calls = 0
    approx_chars = 0

    session_count = 0

    if not os.path.exists(brain_dir):
        print(f"[!] Antigravity brain directory not found at {brain_dir}")
        return

    for session_id in os.listdir(brain_dir):
        session_path = os.path.join(brain_dir, session_id)
        if not os.path.isdir(session_path):
            continue

        transcript_file = os.path.join(session_path, ".system_generated", "logs", "transcript.jsonl")
        if not os.path.isfile(transcript_file):
            continue

        session_count += 1
        mtime = os.path.getmtime(transcript_file)
        file_age = now - mtime

        try:
            with open(transcript_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    entry = json.loads(line)
                    approx_chars += len(line)

                    # Track model turns
                    if entry.get("type") == "PLANNER_RESPONSE":
                        total_turns += 1
                        if file_age <= 3600:
                            hour_turns += 1
                        if file_age <= 86400:
                            day_turns += 1
                        if file_age <= 7 * 86400:
                            week_turns += 1
                        if file_age <= 30 * 86400:
                            month_turns += 1

                    # Track tool executions
                    if entry.get("tool_calls"):
                        total_tool_calls += len(entry["tool_calls"])

        except Exception as e:
            continue

    # 4 chars roughly equals 1 token for code/prose
    estimated_tokens = approx_chars // 4

    print("=" * 60)
    print("  ANTIGRAVITY (AGY) ROLLING USAGE MONITOR")
    print("=" * 60)
    print(f"  Active Sessions Analyzed : {session_count}")
    print(f"  Total Estimated Tokens   : ~{estimated_tokens:,} tokens")
    print(f"  Total Tool Executions    : {total_tool_calls:,} calls")
    print("-" * 60)
    print(f"  [Hourly]  Last 1 Hour    : {hour_turns:4d} model turns")
    print(f"  [Daily]   Last 24 Hours  : {day_turns:4d} model turns")
    print(f"  [Weekly]  Last 7 Days    : {week_turns:4d} model turns")
    print(f"  [Monthly] Last 30 Days   : {month_turns:4d} model turns")
    print("-" * 60)

    # Health & Pacing Indicator
    if hour_turns > 120:
        pacing = "HIGH BURST (Pace yourself to prevent rolling hourly cooldown)"
    elif hour_turns > 60:
        pacing = "MODERATE (Healthy steady-state development)"
    else:
        pacing = "LIGHT (Plenty of hourly runway)"

    print(f"  Pacing Status            : {pacing}")
    print("=" * 60)

if __name__ == "__main__":
    analyze_antigravity_usage()
