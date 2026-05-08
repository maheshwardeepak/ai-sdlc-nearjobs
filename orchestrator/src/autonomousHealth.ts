import { loadDaemonState } from "./daemonState.js";
import { getDaemonMetrics } from "./daemonMetrics.js";
import { getFailureTrends } from "./failureTrends.js";

export function getAutonomousHealth() {
  const daemonState = loadDaemonState();
  const metrics = getDaemonMetrics();
  const trends = getFailureTrends();

  return {
    success: Boolean(metrics.success && trends.success),
    daemonState,
    metrics,
    trends
  };
}
