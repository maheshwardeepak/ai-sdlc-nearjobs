import { getFailureAnalytics } from "./failureAnalytics.js";

export function getFailureTrends() {
  const analytics = getFailureAnalytics();

  if (!analytics.success) {
    return analytics;
  }

  const failuresByTask = analytics.failuresByTask || {};

  const ranked = Object.entries(failuresByTask)
    .sort((a, b) => b[1] - a[1])
    .map(([task, count]) => ({
      task,
      count,
      severity:
        count >= 5
          ? "HIGH"
          : count >= 3
          ? "MEDIUM"
          : "LOW"
    }));

  return {
    success: true,
    totalFailures: analytics.totalFailures,
    unstableTasks: ranked,
    topFailure: ranked[0] || null
  };
}
