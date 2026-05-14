import { RuntimeFailureClass } from "./runtimeFailureClassifier.js";

export type RuntimeRepairStrategy = {
  classification: RuntimeFailureClass;
  action: string;
};

export function repairStrategies(
  failures: RuntimeFailureClass[]
): RuntimeRepairStrategy[] {
  const repairs: RuntimeRepairStrategy[] = [];

  for (const failure of failures) {
    switch (failure) {
      case "port-conflict":
        repairs.push({
          classification: failure,
          action: "reallocate-runtime-ports"
        });
        break;

      case "jdbc-url-invalid":
        repairs.push({
          classification: failure,
          action: "normalize-jdbc-url"
        });
        break;

      case "database-connection-failed":
        repairs.push({
          classification: failure,
          action: "inject-database-runtime-contract"
        });
        break;

      case "missing-dependency":
        repairs.push({
          classification: failure,
          action: "reconcile-missing-dependencies"
        });
        break;

      case "typescript-build-failure":
        repairs.push({
          classification: failure,
          action: "repair-typescript-config"
        });
        break;

      case "vite-build-failure":
        repairs.push({
          classification: failure,
          action: "repair-vite-build"
        });
        break;

      case "container-crash":
        repairs.push({
          classification: failure,
          action: "inspect-runtime-container-logs"
        });
        break;

      case "health-check-failed":
        repairs.push({
          classification: failure,
          action: "inject-runtime-health-contract"
        });
        break;

      default:
        repairs.push({
          classification: failure,
          action: "manual-runtime-analysis"
        });
    }
  }

  return repairs;
}
