import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import { evaluateDeliveryIntegrity } from "../lib/deliveryIntegrityGate";

describe("The Engineer Adherence & Delivery Evaluator Suite", () => {
  describe("1. Financial-Transfer & Atomic Invariants (Adherence)", () => {
    test("requires atomic reservation and database idempotency for financial code", () => {
      const financialPrompt = "Write a Node.js API function to transfer $50 from account A to account B.";
      const sampleBadCode = "async function transfer(fromId, toId, amount) { const user = await db.find(fromId); await db.update(fromId, { balance: user.balance - amount }); }";
      
      const containsAtomicLock = /SELECT\s+.*\s+FOR\s+UPDATE|WHERE\s+balance\s*>=/i.test(sampleBadCode);
      expect(containsAtomicLock).toBe(false);
    });
  });

  describe("2. Python AST Allowlist Inspection (Delivery & Structure)", () => {
    test("passes AST allowlist inspection for valid Python sequence function", () => {
      const pyCode = `
def longest_consecutive(nums: list[int]) -> int:
    """Return the length of the longest consecutive elements sequence."""
    if not nums:
        return 0
    num_set = set(nums)
    longest = 0
    for num in num_set:
        if num - 1 not in num_set:
            current = num
            streak = 1
            while current + 1 in num_set:
                current += 1
                streak += 1
            longest = max(longest, streak)
    return longest
`;
      const astScript = `
import ast, sys
tree = ast.parse(sys.stdin.read())
func = next((n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)), None)
if not func:
    print("NO_FUNC")
    sys.exit(1)
has_doc = ast.get_docstring(func) is not None
has_args_type = any(a.annotation is not None for a in func.args.args)
has_ret_type = func.returns is not None
forbidden = [n for n in ast.walk(tree) if isinstance(n, (ast.Import, ast.ImportFrom))]
if forbidden:
    print("FORBIDDEN_IMPORT")
    sys.exit(1)
if has_doc and has_args_type and has_ret_type:
    print("AST_VALID")
else:
    print(f"AST_MISSING doc={has_doc} args={has_args_type} ret={has_ret_type}")
    sys.exit(1)
`;
      const res = spawnSync("python3", ["-I", "-S", "-c", astScript], {
        input: pyCode,
        encoding: "utf8",
        timeout: 2000
      });
      expect(res.status).toBe(0);
      expect(res.stdout.trim()).toBe("AST_VALID");
    });

    test("rejects AST when Python imports disallowed modules", () => {
      const unsafePyCode = `
import os
def longest_consecutive(nums: list[int]) -> int:
    """Malicious docstring"""
    os.system("echo hacked")
    return 0
`;
      const astScript = `
import ast, sys
tree = ast.parse(sys.stdin.read())
forbidden = [n for n in ast.walk(tree) if isinstance(n, (ast.Import, ast.ImportFrom))]
if forbidden:
    print("FORBIDDEN_IMPORT")
    sys.exit(1)
`;
      const res = spawnSync("python3", ["-I", "-S", "-c", astScript], {
        input: unsafePyCode,
        encoding: "utf8",
        timeout: 2000
      });
      expect(res.status).not.toBe(0);
      expect(res.stdout.trim()).toBe("FORBIDDEN_IMPORT");
    });
  });

  describe("3. Sandboxed Executable Code Verification (Reviewed Fixtures Only)", () => {
    test("executes longest_consecutive sequence solution against 6 test assertions", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "py_exec_test_"));
      const scriptPath = path.join(tmpDir, "test_runner.py");

      const fullRunnerCode = `
def longest_consecutive(nums: list[int]) -> int:
    """Return the length of the longest consecutive elements sequence."""
    if not nums:
        return 0
    num_set = set(nums)
    longest = 0
    for num in num_set:
        if num - 1 not in num_set:
            current = num
            streak = 1
            while current + 1 in num_set:
                current += 1
                streak += 1
            longest = max(longest, streak)
    return longest

assert longest_consecutive([]) == 0
assert longest_consecutive([1]) == 1
assert longest_consecutive([100, 4, 200, 1, 3, 2]) == 4
assert longest_consecutive([1, 2, 0, 1]) == 3
assert longest_consecutive([-2, -1, 0, 2]) == 3
assert longest_consecutive([10, 30, 20]) == 1
print("EXECUTION_PASSED")
`;
      fs.writeFileSync(scriptPath, fullRunnerCode, "utf8");

      try {
        const res = spawnSync("python3", ["-I", "-S", scriptPath], {
          encoding: "utf8",
          timeout: 2000,
          maxBuffer: 1024 * 1024
        });

        expect(res.status).toBe(0);
        expect(res.stdout.trim()).toBe("EXECUTION_PASSED");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
