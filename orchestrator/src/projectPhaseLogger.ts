export function logPhaseEvent(event: {
  type: string;
  project: string;
  phaseId?: string;
  phaseName?: string;
  message?: string;
  data?: unknown;
}) {
  console.log(JSON.stringify({
    createdAt: new Date().toISOString(),
    ...event
  }, null, 2));
}
