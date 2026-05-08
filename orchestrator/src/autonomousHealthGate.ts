import { getAutonomousHealth } from "./autonomousHealth.js";

export function runAutonomousHealthGate() {
  const health = getAutonomousHealth();

  const metrics = (health.metrics as any).metrics;
  const trends = health.trends as any;

  const successRate = metrics?.successRate ?? 0;
  const topSeverity = trends?.topFailure?.severity ?? "NONE";

  const passed =
    health.success &&
    successRate >= 95 &&
    topSeverity !== "HIGH";

  return {
    success: passed,
    thresholds: {
      minSuccessRate: 95,
      disallowTopSeverity: "HIGH"
    },
    observed: {
      successRate,
      topSeverity
    },
    health
  };
}
