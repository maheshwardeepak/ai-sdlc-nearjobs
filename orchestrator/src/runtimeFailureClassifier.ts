export type RuntimeFailureClass =
  | "port-conflict"
  | "jdbc-url-invalid"
  | "database-connection-failed"
  | "missing-dependency"
  | "typescript-build-failure"
  | "vite-build-failure"
  | "container-crash"
  | "health-check-failed"
  | "unknown";

export type RuntimeFailureClassification = {
  classes: RuntimeFailureClass[];
  summary: string;
};

export function classifyRuntimeFailure(logs: string): RuntimeFailureClassification {
  const classes = new Set<RuntimeFailureClass>();

  const lower = logs.toLowerCase();

  if (
    lower.includes("port is already allocated") ||
    lower.includes("address already in use")
  ) {
    classes.add("port-conflict");
  }

  if (
    lower.includes("url must start with 'jdbc'")
  ) {
    classes.add("jdbc-url-invalid");
  }

  if (
    lower.includes("connection refused") ||
    lower.includes("failed to configure a datasource") ||
    lower.includes("postgres")
  ) {
    classes.add("database-connection-failed");
  }

  if (
    lower.includes("cannot find module") ||
    lower.includes("missing") ||
    lower.includes("ts2688")
  ) {
    classes.add("missing-dependency");
  }

  if (
    lower.includes("typescript") ||
    lower.includes("tsc") ||
    lower.includes("ts2688")
  ) {
    classes.add("typescript-build-failure");
  }

  if (
    lower.includes("vite")
  ) {
    classes.add("vite-build-failure");
  }

  if (
    lower.includes("exited") ||
    lower.includes("is not running")
  ) {
    classes.add("container-crash");
  }

  if (
    lower.includes("health") ||
    lower.includes("curl")
  ) {
    classes.add("health-check-failed");
  }

  if (classes.size === 0) {
    classes.add("unknown");
  }

  return {
    classes: Array.from(classes),
    summary: Array.from(classes).join(", ")
  };
}
