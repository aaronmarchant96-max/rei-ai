#!/usr/bin/env python3
import subprocess
import time
import re
import statistics

worker_counts = [2, 3, 4, 6]
runs_per_count = 4 # 1 cold + 3 warm

print("=== Jest Worker Memory & Performance Benchmark Protocol ===")
print("Machine: ThinkPad T14 Gen 2a (AMD Ryzen 5 PRO 5650U, 12 Threads, 16GB RAM)")
print(f"Testing worker counts: {worker_counts} ({runs_per_count} runs each)\n")

results = {}

for w in worker_counts:
    wall_times = []
    max_rss_kb = []
    exit_codes = []
    
    print(f"--- Benchmarking maxWorkers={w} ---")
    for r in range(runs_per_count):
        is_cold = (r == 0)
        label = "Cold Run 1" if is_cold else f"Warm Run {r}"
        
        cmd = f"/usr/bin/time -v npx jest --maxWorkers={w} --runInBand=false"
        start = time.time()
        proc = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd="/home/aaron/.gemini/antigravity/scratch/repos/rei-ai")
        elapsed = time.time() - start
        
        # Parse Max RSS from time -v output
        rss_match = re.search(r"Maximum resident set size \(kbytes\):\s*(\d+)", proc.stderr)
        rss = int(rss_match.group(1)) if rss_match else 0
        
        wall_times.append(elapsed)
        max_rss_kb.append(rss)
        exit_codes.append(proc.returncode)
        
        print(f"  [{label}] Wall: {elapsed:.2f}s | Max RSS: {rss / 1024:.1f} MB | Exit: {proc.returncode}")
    
    warm_times = wall_times[1:]
    results[w] = {
        "cold_wall": wall_times[0],
        "warm_walls": warm_times,
        "median_warm": statistics.median(warm_times),
        "min_warm": min(warm_times),
        "max_warm": max(warm_times),
        "max_rss_mb": max(max_rss_kb) / 1024,
        "all_passed": all(c == 0 for c in exit_codes)
    }

print("\n" + "=" * 70)
print("  JEST WORKER BENCHMARK RESULTS SUMMARY")
print("=" * 70)
print(f"{'Workers':<8} | {'Cold Run':<10} | {'Warm Median':<12} | {'Warm Range':<14} | {'Max RSS (MB)':<14} | {'Status':<8}")
print("-" * 70)

for w in worker_counts:
    res = results[w]
    range_str = f"{res['min_warm']:.2f}s - {res['max_warm']:.2f}s"
    status_str = "PASS" if res["all_passed"] else "FAIL"
    print(f"{w:<8} | {res['cold_wall']:.2f}s     | {res['median_warm']:.2f}s        | {range_str:<14} | {res['max_rss_mb']:.1f} MB       | {status_str:<8}")

print("=" * 70)
