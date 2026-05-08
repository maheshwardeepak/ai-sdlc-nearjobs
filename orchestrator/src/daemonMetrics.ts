import fs from "fs";
import path from "path";

const LOG_FILE = path.resolve(
  process.cwd(),
  "runtime/logs/factory.log"
);

export function getDaemonMetrics() {
  if (!fs.existsSync(LOG_FILE)) {
    return {
      success: false,
      message: "No factory log found."
    };
  }

  const content = fs.readFileSync(LOG_FILE, "utf8");

  const taskStarts = (content.match(/TASK_START/g) || []).length;
  const taskSuccess = (content.match(/TASK_SUCCESS/g) || []).length;
  const taskFailures = (content.match(/TASK_FAILURE/g) || []).length;

  return {
    success: true,
    metrics: {
      taskStarts,
      taskSuccess,
      taskFailures,
      successRate:
        taskStarts === 0
          ? 0
          : Number(
              ((taskSuccess / taskStarts) * 100).toFixed(2)
            )
    }
  };
}
