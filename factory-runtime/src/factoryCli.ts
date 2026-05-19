#!/usr/bin/env node

import {
  approveProjectPlan,
  initializeProjectState,
  loadProjectState,
  statePathForProject
} from "./factoryState.js";
import {
  appendFactoryEvent,
  eventLogPathForProject,
  readFactoryEvents
} from "./eventLog.js";
import {
  dagPathForProject,
  getDagExecutionStatus,
  loadDagForProject,
  phaseStatusPathForProject,
  resumeDag,
  runDag,
  summarizeDagRuntimeState
} from "./dagExecutor.js";

type CommandName =
  | "init-project"
  | "status"
  | "approve-plan"
  | "load-dag"
  | "run"
  | "resume";

interface ParsedArgs {
  command?: string;
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];

    if (!token.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${token}`);
    }

    const equalsIndex = token.indexOf("=");

    if (equalsIndex > -1) {
      const key = token.slice(2, equalsIndex);
      const value = token.slice(equalsIndex + 1);
      flags[key] = value;
      continue;
    }

    const key = token.slice(2);
    const nextToken = rest[index + 1];

    if (nextToken && !nextToken.startsWith("--")) {
      flags[key] = nextToken;
      index += 1;
    } else {
      flags[key] = true;
    }
  }

  return { command, flags };
}

function requireCommand(command: string | undefined): CommandName {
  if (
    command === "init-project" ||
    command === "status" ||
    command === "approve-plan" ||
    command === "load-dag" ||
    command === "run" ||
    command === "resume"
  ) {
    return command;
  }

  throw new Error(
    "Usage: node dist/factoryCli.js <init-project|status|approve-plan|load-dag|run|resume> --project <project>"
  );
}

function requireProjectFlag(flags: Record<string, string | boolean>): string {
  const project = flags.project;

  if (typeof project !== "string" || project.trim().length === 0) {
    throw new Error("Missing required flag: --project <project>");
  }

  return project;
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function readOptionalPositiveInteger(
  flags: Record<string, string | boolean>,
  key: string
): number | undefined {
  const value = flags[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new Error(`--${key} must be a positive integer.`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`--${key} must be a positive integer.`);
  }

  return parsed;
}

async function run(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const command = requireCommand(parsed.command);
  const project = requireProjectFlag(parsed.flags);

  switch (command) {
    case "init-project": {
      const result = initializeProjectState(project);
      const event = appendFactoryEvent({
        project,
        type: result.created ? "PROJECT_INITIALIZED" : "PROJECT_INIT_SKIPPED_EXISTING",
        status: {
          next: result.state.status
        },
        details: {
          created: result.created
        }
      });

      printJson({
        success: true,
        command,
        created: result.created,
        state: result.state,
        statePath: result.statePath,
        eventLogPath: eventLogPathForProject(project),
        event
      });
      return;
    }

    case "status": {
      const state = loadProjectState(project);
      const events = readFactoryEvents(project);

      printJson({
        success: true,
        command,
        state,
        statePath: statePathForProject(project),
        eventLogPath: eventLogPathForProject(project),
        dagPath: dagPathForProject(project),
        phaseStatusPath: phaseStatusPathForProject(project),
        dag: getDagExecutionStatus(project),
        eventCount: events.length,
        nextHumanAction:
          state.status === "WAITING_FOR_PLAN_APPROVAL"
            ? `node dist/factoryCli.js approve-plan --project ${state.projectSlug}`
            : null
      });
      return;
    }

    case "approve-plan": {
      const result = approveProjectPlan(project);
      const event = appendFactoryEvent({
        project,
        type: result.changed ? "PLAN_APPROVED" : "PLAN_APPROVAL_ALREADY_RECORDED",
        status: {
          previous: result.previousStatus,
          next: result.state.status
        },
        details: {
          changed: result.changed,
          humanGate: "planning",
          postPlanExecution: "autonomous"
        }
      });

      printJson({
        success: true,
        command,
        changed: result.changed,
        previousStatus: result.previousStatus,
        state: result.state,
        statePath: result.statePath,
        eventLogPath: eventLogPathForProject(project),
        event
      });
      return;
    }

    case "load-dag": {
      const runtimeState = loadDagForProject(project);

      printJson({
        success: true,
        command,
        dagPath: dagPathForProject(project),
        phaseStatusPath: phaseStatusPathForProject(project),
        summary: summarizeDagRuntimeState(runtimeState),
        runtimeState
      });
      return;
    }

    case "run": {
      const result = await runDag(project, readOptionalPositiveInteger(parsed.flags, "max-phases"));
      printJson({
        command,
        ...result
      });

      if (!result.success) {
        process.exitCode = 1;
      }

      return;
    }

    case "resume": {
      const result = await resumeDag(project, readOptionalPositiveInteger(parsed.flags, "max-phases"));
      printJson({
        command,
        ...result
      });

      if (!result.success) {
        process.exitCode = 1;
      }

      return;
    }
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  process.stderr.write(`${JSON.stringify({ success: false, error: message }, null, 2)}\n`);
  process.exitCode = 1;
});
