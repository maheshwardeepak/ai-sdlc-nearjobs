export function filterApisForPhase(
  phaseId: string,
  apis: string[]
): string[] {
  const phase = phaseId.toLowerCase();

  if (phase.includes("health")) {
    return apis.filter((api) => api.includes("/api/health"));
  }

  if (phase.includes("auth")) {
    return apis.filter((api) => api.includes("/api/auth"));
  }

  if (phase.includes("rbac") || phase.includes("profile") || phase.includes("user")) {
    return apis.filter((api) => api.includes("/api/users"));
  }

  if (phase.includes("team")) {
    return apis.filter((api) => api.includes("/api/teams"));
  }

  if (phase.includes("task")) {
    return apis.filter((api) => api.includes("/api/tasks"));
  }

  if (phase.includes("comments")) {
    return apis.filter((api) => api.includes("/api/comments") || api.includes("/comments"));
  }

  if (phase.includes("activity")) {
    return apis.filter((api) => api.includes("/activity"));
  }

  if (phase.includes("dashboard")) {
    return apis.filter((api) => api.includes("/dashboard"));
  }

  if (phase.includes("packaging") || phase.includes("deployment")) {
    return apis;
  }

  return [];
}
