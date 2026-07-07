/**
 * School ERP — Release Candidate test suite runner.
 * Usage: node backend/scripts/runRcSuite.js
 *
 * Runs all RC hardening and workflow scripts in sequence.
 * Exit 0 when every present script passes; exit 1 if any fails.
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SCRIPTS_DIR = __dirname;

const RC_SUITE_SCRIPTS = [
  "testRBACCleanupSprint.js",
  "testStudentsHardening.js",
  "testTeacherHardening.js",
  "testStaffPostHardening.js",
  "testPromotionHardening.js",
  "testAttendanceHardening.js",
  "testTimetableHardening.js",
  "testResultsHardening.js",
  "testReportCardsHardening.js",
  "testActivitiesHardening.js",
  "testActivityWorkflow.js",
  "testExpenseRequestsHardening.js",
  "testExpenseRequestsService.js",
  "testCashbookHardening.js",
  "testCashbookService.js",
  "testStockRegisterHardening.js",
  "testStockRegisterWorkflow.js",
  "testDashboardHardening.js",
  "testSubjectHardening.js",
  "testMultiTenantSprint1.js",
];

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const color = {
  green: useColor ? "\x1b[32m" : "",
  red: useColor ? "\x1b[31m" : "",
  yellow: useColor ? "\x1b[33m" : "",
  dim: useColor ? "\x1b[2m" : "",
  reset: useColor ? "\x1b[0m" : "",
};

const formatDuration = (ms) => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
};

const runScript = (filename) => {
  const scriptPath = path.join(SCRIPTS_DIR, filename);
  const startedAt = Date.now();

  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: SCRIPTS_DIR,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });

  const durationMs = Date.now() - startedAt;
  const exitCode = result.status ?? 1;

  return {
    filename,
    exitCode,
    durationMs,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    signal: result.signal,
    error: result.error,
  };
};

const main = () => {
  const suiteStartedAt = Date.now();
  const results = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  console.log("");
  console.log("==================================================");
  console.log("School ERP RC Suite");
  console.log("==================================================");
  console.log("");

  for (const filename of RC_SUITE_SCRIPTS) {
    const scriptPath = path.join(SCRIPTS_DIR, filename);

    if (!fs.existsSync(scriptPath)) {
      skipped += 1;
      console.log(
        `${color.yellow}○ ${filename} (skipped — not found)${color.reset}`
      );
      results.push({ filename, status: "skipped" });
      continue;
    }

    const result = runScript(filename);
    const ok = result.exitCode === 0 && !result.signal && !result.error;

    if (ok) {
      passed += 1;
      console.log(
        `${color.green}✓${color.reset} ${filename} ${color.dim}(${formatDuration(result.durationMs)})${color.reset}`
      );
      results.push({ ...result, status: "passed" });
    } else {
      failed += 1;
      const codeLabel =
        result.signal != null
          ? `signal ${result.signal}`
          : `exit ${result.exitCode ?? 1}`;
      console.log(
        `${color.red}✗${color.reset} ${filename} ${color.dim}(${formatDuration(result.durationMs)}, ${codeLabel})${color.reset}`
      );
      results.push({ ...result, status: "failed" });
    }
  }

  const totalDurationMs = Date.now() - suiteStartedAt;
  const total = RC_SUITE_SCRIPTS.length;

  console.log("");
  console.log("--------------------------------------------------");
  console.log("");
  console.log(`Total:    ${total}`);
  console.log(`${color.green}Passed:${color.reset}   ${passed}`);
  console.log(`${color.red}Failed:${color.reset}   ${failed}`);
  console.log(`${color.yellow}Skipped:${color.reset}  ${skipped}`);
  console.log(`Duration: ${formatDuration(totalDurationMs)}`);
  console.log("");
  console.log("==================================================");

  const failedResults = results.filter((entry) => entry.status === "failed");

  if (failedResults.length > 0) {
    console.log("");
    console.log(`${color.red}FAILED TESTS${color.reset}`);
    console.log("");

    for (const entry of failedResults) {
      const codeLabel =
        entry.signal != null
          ? `signal ${entry.signal}`
          : `exit code ${entry.exitCode ?? 1}`;
      console.log(`- ${entry.filename} (${codeLabel})`);

      if (entry.error) {
        console.log(`  spawn error: ${entry.error.message}`);
      }

      const output = [entry.stdout, entry.stderr].filter(Boolean).join("\n").trim();
      if (output) {
        const lines = output.split("\n");
        const tail = lines.slice(-8).join("\n");
        console.log(`${color.dim}${tail}${color.reset}`);
      }
    }

    console.log("");
    process.exit(1);
  }

  console.log("");
  process.exit(0);
};

main();
