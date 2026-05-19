import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { FACTORY_RUNTIME_ROOT, slugifyProjectName } from "./factoryState.js";
export const EVENTS_DIRECTORY = path.join(FACTORY_RUNTIME_ROOT, "events");
function ensureDirectory(directoryPath) {
    fs.mkdirSync(directoryPath, { recursive: true });
}
export function eventLogPathForProject(project) {
    return path.join(EVENTS_DIRECTORY, `${slugifyProjectName(project)}.jsonl`);
}
export function appendFactoryEvent(input) {
    ensureDirectory(EVENTS_DIRECTORY);
    const now = input.now ?? new Date();
    const event = {
        schemaVersion: 1,
        eventId: crypto.randomUUID(),
        timestamp: now.toISOString(),
        project: input.project,
        projectSlug: slugifyProjectName(input.project),
        type: input.type,
        status: input.status,
        phase: input.phase,
        details: input.details
    };
    fs.appendFileSync(eventLogPathForProject(input.project), `${JSON.stringify(event)}\n`, "utf8");
    return event;
}
export function readFactoryEvents(project) {
    const eventLogPath = eventLogPathForProject(project);
    if (!fs.existsSync(eventLogPath)) {
        return [];
    }
    return fs
        .readFileSync(eventLogPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}
//# sourceMappingURL=eventLog.js.map