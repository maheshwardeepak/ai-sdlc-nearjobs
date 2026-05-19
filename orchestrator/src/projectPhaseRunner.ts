import fs from "node:fs";
import path from "node:path";
import { executeOpenClawTask } from "./openclawAdapter.js";
import { extractPhaseArtifacts } from "./phaseArtifactExtractor.js";
import { writePhaseArtifacts } from "./phaseArtifactWriter.js";
import { runSelfHealingBuildLoop } from "./selfHealingBuildLoop.js";
import { runPhaseTestConvergence } from "./phaseTestConvergence.js";
import { runPhaseRuntimeConvergence } from "./phaseRuntimeConvergence.js";
import { createPhaseCheckpoint, restorePhaseCheckpoint } from "./phaseCheckpoint.js";
import { detectContractDrift } from "./contractDriftDetector.js";
import { repairContractDrift } from "./contractDriftRepair.js";
import { runPhaseSecurityComplianceGate } from "./phaseSecurityComplianceGate.js";
import {
  loadProjectPhaseDag,
  ProjectPhaseDag
} from "./projectPhaseDag.js";
import {
  appendProjectPhaseMemory,
  summarizeProjectPhaseMemory
} from "./projectPhaseMemory.js";
import {
  updateProjectSyncMemory
} from "./projectSyncMemory.js";
import { compactProjectMemory } from "./projectMemoryCompactor.js";
import { ensurePackagingWorkspace } from "./packagingWorkspacePreflight.js";
import { runBackendCompileConvergence } from "./backendCompileConvergence.js";

export type PhaseRunnerResult = {
  success: boolean;
  phaseId: string;
  phaseName: string;
  output: string;
};



function shouldValidateContracts(phaseId: string): boolean {
  return [
    "health",
    "auth",
    "rbac",
    "team",
    "task",
    "comments",
    "activity",
    "dashboard",
    "api",
    "backend",
    "packaging",
    "deployment"
  ].some((token) => phaseId.includes(token));
}

function isPlanningApproved(projectName: string): boolean {
  const approvalPath = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    projectName.toLowerCase().replace(/[^a-z0-9]+/g, ""),
    "approval.json"
  );

  if (!fs.existsSync(approvalPath)) {
    return false;
  }

  const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
  return approval.approved === true;
}

function dagPath(projectName: string): string {
  return path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    projectName.toLowerCase().replace(/[^a-z0-9]+/g, ""),
    "project-phase-dag.json"
  );
}

function saveDag(projectName: string, dag: ProjectPhaseDag): void {
  fs.writeFileSync(
    dagPath(projectName),
    JSON.stringify(dag, null, 2)
  );
}

export async function runProjectPhase(
  projectName: string,
  phaseId: string
): Promise<PhaseRunnerResult> {
  const dag = loadProjectPhaseDag(projectName);

  const node = dag.nodes.find((item) => item.id === phaseId);

  if (!node) {
    throw new Error(`Phase not found: ${phaseId}`);
  }

  const unmetDependencies = node.dependsOn.filter((dependencyId) => {
    if (
      dependencyId === "planning-approval" &&
      isPlanningApproved(projectName)
    ) {
      return false;
    }

    const dependency = dag.nodes.find((item) => item.id === dependencyId);
    return dependency?.status !== "PASSED";
  });

  if (unmetDependencies.length > 0) {
    throw new Error(
      `Phase ${phaseId} blocked by dependencies: ${unmetDependencies.join(", ")}`
    );
  }

  node.status = "RUNNING";
  saveDag(projectName, dag);

  const startedAt = new Date().toISOString();

  try {
    const runDir = path.resolve(
      process.cwd(),
      "artifacts/autonomous-runs",
      projectName.toLowerCase().replace(/[^a-z0-9]+/g, "")
    );

    const aiPlan = fs.readFileSync(
      path.join(runDir, "ai-project-plan.json"),
      "utf8"
    );

    const phaseMemory = summarizeProjectPhaseMemory(projectName);

    const result = await executeOpenClawTask({
      workerId: `phase-agent-${projectName.toLowerCase()}-${node.id}-${Date.now()}`,
      workspacePath: runDir,
      prompt: [
        "You are an autonomous SDLC phase execution agent.",
        "",
        `Project: ${projectName}`,
        `Phase ID: ${node.id}`,
        `Phase Name: ${node.name}`,
        `Phase Goal: ${node.goal}`,
        "",
        "AI Project Plan JSON:",
        aiPlan,
        "",
        "Prior Phase Memory:",
        phaseMemory,
        "",
        "Execute this phase by producing concrete file artifacts.",
        "Do not only describe the work.",
        "You must return one or more fenced file blocks using exactly:",
        "```file:relative/path",
        "file content",
        "```",
        "",
        "Return concise Markdown with:",
        "- files to create/update",
        "- backend work",
        "- frontend work",
        "- database work",
        "- tests required",
        "- validation gates",
        "- phase completion summary"
      ].join("\n")
    });

    const phaseOutputDir = path.join(runDir, "phase-outputs");
    fs.mkdirSync(phaseOutputDir, { recursive: true });

    const phaseOutputFile = path.join(
      phaseOutputDir,
      `${node.id}.md`
    );

    fs.writeFileSync(
      phaseOutputFile,
      result.stdout || ""
    );

    const workspaceRoot = path.resolve(
      process.cwd(),
      "runtime/workspaces",
      projectName.toLowerCase().replace(/[^a-z0-9]+/g, "")
    );

    fs.mkdirSync(path.join(workspaceRoot, "workers"), { recursive: true });

    const checkpoint = createPhaseCheckpoint({
      projectName,
      phaseId: node.id,
      workspaceRoot
    });

    const extractedArtifacts = extractPhaseArtifacts(result.stdout || "");

    if (extractedArtifacts.length === 0) {
      throw new Error(
        `Phase ${node.id} produced no file artifacts.`
      );
    }

    const artifactWrite = writePhaseArtifacts(workspaceRoot, extractedArtifacts);

    if (node.id === "packaging-deployment") {
      const packagingPreflight = ensurePackagingWorkspace(projectName, workspaceRoot);

      if (!packagingPreflight.success) {
        throw new Error(
          `Packaging workspace preflight failed: ${JSON.stringify(packagingPreflight, null, 2)}`
        );
      }
    }

    const backendCompile = await runBackendCompileConvergence({
      projectName,
      phaseId: node.id,
      phaseName: node.name,
      workspaceRoot
    });

    if (!backendCompile.success) {
      throw new Error(
        `Backend compile convergence failed for ${node.id}: ${JSON.stringify(backendCompile, null, 2)}`
      );
    }

    const buildConvergence = runSelfHealingBuildLoop(workspaceRoot);

    if (!buildConvergence.success) {
      throw new Error(
        `Phase build convergence failed for ${node.id}: ${JSON.stringify(buildConvergence, null, 2)}`
      );
    }

    const testConvergence = runPhaseTestConvergence(workspaceRoot);

    if (!testConvergence.success) {
      throw new Error(
        `Phase test convergence failed for ${node.id}: ${JSON.stringify(testConvergence, null, 2)}`
      );
    }

    const securityCompliance = runPhaseSecurityComplianceGate(workspaceRoot);

    if (!securityCompliance.success) {
      throw new Error(
        `Security compliance failed for ${node.id}: ${JSON.stringify(securityCompliance, null, 2)}`
      );
    }

    let contractDrift = shouldValidateContracts(node.id)
      ? detectContractDrift(projectName, workspaceRoot, node.id)
      : {
          success: true,
          backendApis: [],
          plannedApis: [],
          missingBackendApis: [],
          extraBackendApis: []
        };

    if (!contractDrift.success) {
      const repair = await repairContractDrift({
        projectName,
        workspaceRoot,
        drift: contractDrift
      });

      if (!repair.success || !repair.stdout) {
        throw new Error(
          `Contract drift repair failed for ${node.id}: ${JSON.stringify({ contractDrift, repair }, null, 2)}`
        );
      }

      const repairArtifacts = extractPhaseArtifacts(repair.stdout);
      const repairWrite = writePhaseArtifacts(workspaceRoot, repairArtifacts);

      if (!repairWrite.success) {
        throw new Error(
          `Contract drift repair artifact write failed for ${node.id}: ${JSON.stringify(repairWrite, null, 2)}`
        );
      }

      const postRepairBuild = runSelfHealingBuildLoop(workspaceRoot);

      if (!postRepairBuild.success) {
        throw new Error(
          `Contract drift repair build failed for ${node.id}: ${JSON.stringify(postRepairBuild, null, 2)}`
        );
      }

      contractDrift = detectContractDrift(projectName, workspaceRoot, node.id);
    }

    if (!contractDrift.success) {
      throw new Error(
        `Contract drift detected for ${node.id}: ${JSON.stringify(contractDrift, null, 2)}`
      );
    }

    const runtimeConvergence = await runPhaseRuntimeConvergence({
      projectName,
      phaseId: node.id,
      workspaceRoot
    });

    if (!runtimeConvergence.success) {
      throw new Error(
        `Phase runtime convergence failed for ${node.id}: ${JSON.stringify(runtimeConvergence, null, 2)}`
      );
    }

    node.status = "PASSED";
    saveDag(projectName, dag);

    appendProjectPhaseMemory(projectName, {
      project: projectName,
      phaseId: node.id,
      phaseName: node.name,
      status: "PASSED",
      startedAt,
      completedAt: new Date().toISOString(),
      summary: `Successfully executed phase ${node.name}`,
      artifacts: [
        result.outputFile,
        phaseOutputFile,
        ...artifactWrite.writtenFiles
      ],
      gates: {
        execution: true,
        checkpoint: checkpoint.success,
        artifactExtraction: true,
        artifactWrite: artifactWrite.success,
        buildConvergence: buildConvergence.success,
        testConvergence: testConvergence.success,
        securityCompliance: securityCompliance.success,
        contractDrift: contractDrift.success,
        runtimeConvergence: runtimeConvergence.success
      },
      notes: [
        node.goal
      ]
    });

    updateProjectSyncMemory({
      projectName,
      currentPhaseId: node.id,
      artifacts: [
        result.outputFile,
        phaseOutputFile,
        ...artifactWrite.writtenFiles
      ],
      decisions: [
        `Phase completed: ${node.name}`
      ],
      gates: {
        [node.id]: true,
        [`${node.id}:artifactWrite`]: artifactWrite.success,
        [`${node.id}:buildConvergence`]: buildConvergence.success,
        [`${node.id}:testConvergence`]: testConvergence.success,
        [`${node.id}:securityCompliance`]: securityCompliance.success,
        [`${node.id}:contractDrift`]: contractDrift.success,
        [`${node.id}:runtimeConvergence`]: runtimeConvergence.success
      },
      nextAction: "Proceed to next autonomous phase"
    });

    compactProjectMemory(projectName);

    return {
      success: true,
      phaseId: node.id,
      phaseName: node.name,
      output: result.stdout
    };
  } catch (error: any) {
    const workspaceRoot = path.resolve(
      process.cwd(),
      "runtime/workspaces",
      projectName.toLowerCase().replace(/[^a-z0-9]+/g, "")
    );

    fs.mkdirSync(path.join(workspaceRoot, "workers"), { recursive: true });

    const checkpointRoot = path.resolve(
      process.cwd(),
      "artifacts/autonomous-runs",
      projectName.toLowerCase().replace(/[^a-z0-9]+/g, ""),
      "checkpoints",
      node.id
    );

    const rollback = restorePhaseCheckpoint({
      checkpointRoot,
      workspaceRoot
    });

    node.status = "FAILED";
    saveDag(projectName, dag);

    appendProjectPhaseMemory(projectName, {
      project: projectName,
      phaseId: node.id,
      phaseName: node.name,
      status: "FAILED",
      startedAt,
      completedAt: new Date().toISOString(),
      summary: `Phase failed: ${node.name}`,
      artifacts: [],
      gates: {
        execution: false,
        rollback: rollback.success
      },
      notes: [
        error.message || "Unknown failure",
        `Rollback restored: ${rollback.success}`
      ]
    });

    updateProjectSyncMemory({
      projectName,
      currentPhaseId: node.id,
      artifacts: [],
      decisions: [
        `Phase failed: ${node.name}`
      ],
      gates: {
        [node.id]: false,
        [`${node.id}:rollback`]: rollback.success
      },
      nextAction: "Repair failed phase before continuing"
    });

    return {
      success: false,
      phaseId: node.id,
      phaseName: node.name,
      output: error.message || "Unknown failure"
    };
  }
}
