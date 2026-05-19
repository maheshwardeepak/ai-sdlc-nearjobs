export const PHASE_STATUSES = [
    "PENDING",
    "RUNNING",
    "PASSED",
    "FAILED",
    "REPAIRING"
];
export const VALIDATOR_TYPES = [
    "shell",
    "backend-build",
    "frontend-build",
    "docker-compose-config",
    "playwright",
    "runtime-health-curl"
];
export const WORKER_TYPES = ["shell", "codex-placeholder"];
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`DAG phase ${fieldName} must be a non-empty string.`);
    }
    return value;
}
function readStringArray(value, fieldName) {
    if (value === undefined) {
        return [];
    }
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
        throw new Error(`DAG phase ${fieldName} must be an array of strings.`);
    }
    return value;
}
function readStringRecord(value, fieldName) {
    if (value === undefined) {
        return undefined;
    }
    if (!isRecord(value)) {
        throw new Error(`DAG phase ${fieldName} must be an object of string values.`);
    }
    const result = {};
    for (const [key, child] of Object.entries(value)) {
        if (typeof child !== "string") {
            throw new Error(`DAG phase ${fieldName}.${key} must be a string.`);
        }
        result[key] = child;
    }
    return result;
}
function readNonNegativeInteger(value, fieldName) {
    if (value === undefined) {
        return undefined;
    }
    if (!Number.isInteger(value) || Number(value) < 0) {
        throw new Error(`${fieldName} must be a non-negative integer.`);
    }
    return Number(value);
}
function normalizeWorkerType(value, phaseId) {
    if (value === undefined) {
        return "shell";
    }
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`DAG phase ${phaseId} worker type must be a non-empty string.`);
    }
    const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
    if (WORKER_TYPES.includes(normalized)) {
        return normalized;
    }
    throw new Error(`DAG phase ${phaseId} worker type ${value} is unsupported. Supported workers: ${WORKER_TYPES.join(", ")}`);
}
function readWorker(value, phaseId) {
    if (value === undefined) {
        return undefined;
    }
    if (!isRecord(value)) {
        throw new Error(`DAG phase ${phaseId} worker must be an object.`);
    }
    if (value.command !== undefined && typeof value.command !== "string") {
        throw new Error(`DAG phase ${phaseId} worker command must be a string.`);
    }
    if (value.prompt !== undefined && typeof value.prompt !== "string") {
        throw new Error(`DAG phase ${phaseId} worker prompt must be a string.`);
    }
    if (value.cwd !== undefined && typeof value.cwd !== "string") {
        throw new Error(`DAG phase ${phaseId} worker cwd must be a string.`);
    }
    return {
        type: normalizeWorkerType(value.type, phaseId),
        command: value.command,
        prompt: value.prompt,
        cwd: value.cwd,
        env: readStringRecord(value.env, "env"),
        timeoutMs: readNonNegativeInteger(value.timeoutMs, `DAG phase ${phaseId} worker timeoutMs`),
        retries: readNonNegativeInteger(value.retries, `DAG phase ${phaseId} worker retries`)
    };
}
function normalizeValidatorType(value, phaseId) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`DAG phase ${phaseId} validator type must be a non-empty string.`);
    }
    const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
    if (VALIDATOR_TYPES.includes(normalized)) {
        return normalized;
    }
    throw new Error(`DAG phase ${phaseId} validator type ${value} is unsupported. Supported validators: ${VALIDATOR_TYPES.join(", ")}`);
}
function readValidators(value, phaseId) {
    if (value === undefined) {
        return [];
    }
    if (!Array.isArray(value)) {
        throw new Error(`DAG phase ${phaseId} validators must be an array.`);
    }
    return value.map((rawValidator, index) => {
        if (!isRecord(rawValidator)) {
            throw new Error(`DAG phase ${phaseId} validator ${index + 1} must be an object.`);
        }
        const type = normalizeValidatorType(rawValidator.type, phaseId);
        const id = typeof rawValidator.id === "string" && rawValidator.id.trim().length > 0
            ? rawValidator.id
            : `${type}-${index + 1}`;
        const name = typeof rawValidator.name === "string" && rawValidator.name.trim().length > 0
            ? rawValidator.name
            : id;
        if (rawValidator.command !== undefined && typeof rawValidator.command !== "string") {
            throw new Error(`DAG phase ${phaseId} validator ${id} command must be a string.`);
        }
        if (rawValidator.cwd !== undefined && typeof rawValidator.cwd !== "string") {
            throw new Error(`DAG phase ${phaseId} validator ${id} cwd must be a string.`);
        }
        if (rawValidator.url !== undefined && typeof rawValidator.url !== "string") {
            throw new Error(`DAG phase ${phaseId} validator ${id} url must be a string.`);
        }
        if (type === "shell" && !rawValidator.command) {
            throw new Error(`DAG phase ${phaseId} shell validator ${id} requires command.`);
        }
        if (type === "runtime-health-curl" && !rawValidator.command && !rawValidator.url) {
            throw new Error(`DAG phase ${phaseId} runtime-health-curl validator ${id} requires url or command.`);
        }
        return {
            id,
            name,
            type,
            command: rawValidator.command,
            cwd: rawValidator.cwd,
            url: rawValidator.url,
            env: readStringRecord(rawValidator.env, "env")
        };
    });
}
function readRepairs(value, phaseId) {
    if (value === undefined) {
        return [];
    }
    if (!Array.isArray(value)) {
        throw new Error(`DAG phase ${phaseId} repairs must be an array.`);
    }
    return value.map((rawRepair, index) => {
        if (!isRecord(rawRepair)) {
            throw new Error(`DAG phase ${phaseId} repair ${index + 1} must be an object.`);
        }
        const id = typeof rawRepair.id === "string" && rawRepair.id.trim().length > 0
            ? rawRepair.id
            : `repair-${index + 1}`;
        const name = typeof rawRepair.name === "string" && rawRepair.name.trim().length > 0
            ? rawRepair.name
            : id;
        if (typeof rawRepair.command !== "string" || rawRepair.command.trim().length === 0) {
            throw new Error(`DAG phase ${phaseId} repair ${id} requires command.`);
        }
        if (rawRepair.cwd !== undefined && typeof rawRepair.cwd !== "string") {
            throw new Error(`DAG phase ${phaseId} repair ${id} cwd must be a string.`);
        }
        return {
            id,
            name,
            command: rawRepair.command,
            cwd: rawRepair.cwd,
            env: readStringRecord(rawRepair.env, "env")
        };
    });
}
export function normalizeDagDefinition(value) {
    if (!isRecord(value)) {
        throw new Error("DAG must be a JSON object.");
    }
    if (value.schemaVersion !== 1) {
        throw new Error("DAG schemaVersion must be 1.");
    }
    const rawPhases = value.phases;
    if (!Array.isArray(rawPhases) || rawPhases.length === 0) {
        throw new Error("DAG phases must be a non-empty array.");
    }
    const phases = rawPhases.map((rawPhase) => {
        if (!isRecord(rawPhase)) {
            throw new Error("Every DAG phase must be an object.");
        }
        const id = readString(rawPhase.id, "id");
        const name = typeof rawPhase.name === "string" && rawPhase.name.trim().length > 0
            ? rawPhase.name
            : id;
        const dependsOn = readStringArray(rawPhase.dependsOn, "dependsOn");
        if (rawPhase.command !== undefined && typeof rawPhase.command !== "string") {
            throw new Error(`DAG phase ${id} command must be a string.`);
        }
        if (rawPhase.cwd !== undefined && typeof rawPhase.cwd !== "string") {
            throw new Error(`DAG phase ${id} cwd must be a string.`);
        }
        return {
            id,
            name,
            dependsOn,
            command: rawPhase.command,
            cwd: rawPhase.cwd,
            env: readStringRecord(rawPhase.env, "env"),
            timeoutMs: readNonNegativeInteger(rawPhase.timeoutMs, `DAG phase ${id} timeoutMs`),
            retries: readNonNegativeInteger(rawPhase.retries, `DAG phase ${id} retries`),
            worker: readWorker(rawPhase.worker, id),
            validators: readValidators(rawPhase.validators, id),
            repairs: readRepairs(rawPhase.repairs, id)
        };
    });
    validateDagPhases(phases);
    return {
        schemaVersion: 1,
        project: typeof value.project === "string" ? value.project : undefined,
        phases
    };
}
export function createInitialPhaseStateMap(dag) {
    return Object.fromEntries(dag.phases.map((phase) => [
        phase.id,
        {
            id: phase.id,
            status: "PENDING",
            attempts: 0
        }
    ]));
}
export function mergePhaseStateMap(dag, existing) {
    const initial = createInitialPhaseStateMap(dag);
    if (!existing) {
        return initial;
    }
    for (const phase of dag.phases) {
        const existingPhaseState = existing[phase.id];
        if (existingPhaseState && PHASE_STATUSES.includes(existingPhaseState.status)) {
            initial[phase.id] = {
                ...initial[phase.id],
                ...existingPhaseState,
                id: phase.id
            };
        }
    }
    return initial;
}
export function getPhasesInDependencyOrder(dag) {
    const phaseById = new Map(dag.phases.map((phase) => [phase.id, phase]));
    const indegree = new Map();
    const dependents = new Map();
    for (const phase of dag.phases) {
        indegree.set(phase.id, phase.dependsOn.length);
        for (const dependency of phase.dependsOn) {
            const items = dependents.get(dependency) ?? [];
            items.push(phase.id);
            dependents.set(dependency, items);
        }
    }
    const queue = dag.phases
        .filter((phase) => phase.dependsOn.length === 0)
        .map((phase) => phase.id);
    const ordered = [];
    while (queue.length > 0) {
        const phaseId = queue.shift();
        if (!phaseId) {
            break;
        }
        const phase = phaseById.get(phaseId);
        if (!phase) {
            throw new Error(`DAG references missing phase: ${phaseId}`);
        }
        ordered.push(phase);
        for (const dependentId of dependents.get(phaseId) ?? []) {
            const nextIndegree = (indegree.get(dependentId) ?? 0) - 1;
            indegree.set(dependentId, nextIndegree);
            if (nextIndegree === 0) {
                queue.push(dependentId);
            }
        }
    }
    if (ordered.length !== dag.phases.length) {
        throw new Error("DAG contains a dependency cycle.");
    }
    return ordered;
}
export function getNextRunnablePhase(dag, phaseStates) {
    for (const phase of getPhasesInDependencyOrder(dag)) {
        const phaseState = phaseStates[phase.id];
        if (!phaseState || phaseState.status !== "PENDING") {
            continue;
        }
        const dependenciesPassed = phase.dependsOn.every((dependencyId) => {
            return phaseStates[dependencyId]?.status === "PASSED";
        });
        if (dependenciesPassed) {
            return phase;
        }
    }
    return null;
}
export function getBlockingPhaseStates(phaseStates) {
    return Object.values(phaseStates).filter((phaseState) => {
        return (phaseState.status === "RUNNING" ||
            phaseState.status === "FAILED" ||
            phaseState.status === "REPAIRING");
    });
}
export function isDagComplete(phaseStates) {
    return Object.values(phaseStates).every((phaseState) => phaseState.status === "PASSED");
}
function validateDagPhases(phases) {
    const seen = new Set();
    for (const phase of phases) {
        if (seen.has(phase.id)) {
            throw new Error(`Duplicate DAG phase id: ${phase.id}`);
        }
        seen.add(phase.id);
    }
    for (const phase of phases) {
        for (const dependency of phase.dependsOn) {
            if (!seen.has(dependency)) {
                throw new Error(`DAG phase ${phase.id} depends on unknown phase ${dependency}.`);
            }
            if (dependency === phase.id) {
                throw new Error(`DAG phase ${phase.id} cannot depend on itself.`);
            }
        }
    }
    getPhasesInDependencyOrder({
        schemaVersion: 1,
        phases
    });
}
//# sourceMappingURL=taskQueue.js.map