import fs from "fs";
import path from "path";

const LOG_FILE = path.resolve(
  process.cwd(),
  "runtime/logs/factory.log"
);

type FailureRecord = {
  task?: string;
  line: string;
};

export function getFailureAnalytics() {
  if (!fs.existsSync(LOG_FILE)) {
    return {
      success: false,
      message: "No factory log found."
    };
  }

  const lines = fs
    .readFileSync(LOG_FILE, "utf8")
    .split("\n");

  const failures: FailureRecord[] = [];

  for (const line of lines) {
    if (!line.includes("TASK_FAILURE")) {
      continue;
    }

    const taskMatch = line.match(/"task":"([^"]+)"/);

    failures.push({
      task: taskMatch?.[1],
      line
    });
  }

  const counts: Record<string, number> = {};

  for (const failure of failures) {
    const task = failure.task || "unknown";

    counts[task] = (counts[task] || 0) + 1;
  }

  return {
    success: true,
    totalFailures: failures.length,
    failuresByTask: counts,
    recentFailures: failures.slice(-10)
  };
}
