// Checkpoint 3: runs your smoke suite against the working shop and five broken copies.
//   npm run checkpoint                      (checks tests/checkpoint/)
//   npm run checkpoint -- tests/solutions/checkpoint-3.spec.ts
// Your suite must PASS on the working shop and FAIL on every broken one.
import { spawnSync } from "node:child_process";
import { BUGS } from "./server.mjs";

const target = process.argv[2] ?? "tests/checkpoint";
const runs = [{ bug: null, label: "working shop" }, ...Object.keys(BUGS).map((bug) => ({ bug, label: bug }))];
let port = 3300;
let ok = 0;
console.log(`Checking ${target}\n`);
for (const r of runs) {
  const env = { ...process.env, PORT: String(port++) };
  if (r.bug) env.BUG = r.bug; else delete env.BUG;
  const res = spawnSync("npx", ["playwright", "test", target, "--project=chromium", "--reporter=dot", "--retries=0", "--no-deps"], { env, encoding: "utf8" });
  const out = res.stdout + res.stderr;
  // Only skipped/fixme tests (like the starter) count as "no tests".
  const noTests = /No tests found/i.test(out) || !/\d+ (passed|failed)/.test(out);
  const passed = res.status === 0 && !noTests;
  const good = r.bug ? !passed && !noTests : passed;
  if (good) ok++;
  const verdict = r.bug ? (passed ? "❌ missed: your suite passed on this broken shop" : noTests ? "❌ no tests found" : "✅ caught") : (passed ? "✅ passes" : noTests ? "❌ no tests found" : "❌ fails on the working shop (fix your tests first)");
  console.log(`${r.bug ? "🐞" : "🏪"} ${r.label.padEnd(22)} ${verdict}`);
}
console.log(`\n${ok}/${runs.length} ${ok === runs.length ? "🏁 Checkpoint complete!" : "Keep going: improve the tests for the ones that aren't ✅."}`);
process.exit(ok === runs.length ? 0 : 1);
