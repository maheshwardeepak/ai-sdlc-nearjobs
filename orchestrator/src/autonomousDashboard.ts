import { getAutonomousHealth } from "./autonomousHealth.js";
import { getDaemonMetrics } from "./daemonMetrics.js";
import { getFailureTrends } from "./failureTrends.js";
import { loadDaemonState } from "./daemonState.js";

export function generateAutonomousDashboard() {
  const health = getAutonomousHealth();
  const metrics = getDaemonMetrics();
  const trends = getFailureTrends();
  const daemon = loadDaemonState();

  return {
    generatedAt: new Date().toISOString(),
    platform: {
      healthy: health.success
    },
    daemon,
    metrics,
    trends
  };
}
