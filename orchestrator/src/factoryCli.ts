import { synthesizeProject } from "./projectSynthesizer.js";
import { applyRepoPatches } from "./repoPatchEngine.js";
import { runBuildPipeline } from "./buildExecutor.js";
import { validateRuntime } from "./runtimeValidator.js";
import { runAutoFixLoop } from "./autoFixLoop.js";
import { validateDeployReadiness } from "./deployReadinessValidator.js";
import { materializeDeployableApp } from "./appMaterializer.js";
import { runSelfHealingRuntimeLoop } from "./selfHealingRuntimeLoop.js";
import { runApiSmokeGate } from "./apiSmokeTestGate.js";
import { runBuildVerificationGate } from "./buildVerificationGate.js";
import { runPlaywrightGate } from "./playwrightGate.js";
import { runProjectVerificationGate } from "./projectVerificationGate.js";
import { generateReleaseReport } from "./releaseReporter.js";
import { generateReleaseManifest } from "./releaseManifest.js";
import { runDelivery } from "./deliveryCommand.js";
import { runFleetDelivery } from "./fleetDelivery.js";
import { runDaemonOnce, startSmartDaemon } from "./autonomousDaemon.js";
import { loadDaemonState } from "./daemonState.js";
import { getDaemonMetrics } from "./daemonMetrics.js";
import { getFailureAnalytics } from "./failureAnalytics.js";
import { getFailureTrends } from "./failureTrends.js";
import { getAutonomousHealth } from "./autonomousHealth.js";
import { runAutonomousHealthGate } from "./autonomousHealthGate.js";
import { generateAutonomousDashboard } from "./autonomousDashboard.js";
import { runSmartFleetDelivery } from "./smartFleetDelivery.js";
import { applySafeRepoPatches } from "./safeRepoPatchEngine.js";
import { runAutonomousFailureRepair } from "./failureRepairEngine.js";
import { runCleanRebuildGate } from "./cleanRebuildGate.js";
import { runSecurityGate } from "./securityGate.js";
import { approvePlan, requestApproval, requestRevision } from "./approval.js";
import { createRunPlan, loadDag, validateDag } from "./dagExecutor.js";
import { runApprovedDagOnce } from "./agentRunner.js";
import { createProjectWorkspace } from "./workspaceManager.js";
import { createEngineeringClones, createValidationClones } from "./cloneManager.js";
import { executeAllClones } from "./parallelExecutor.js";
import { initRuntimeDb } from "./db/runtimeDb.js";
import { runInfraPreflight } from "./infraPreflight.js";
import { detectGitRepos } from "./git/submoduleDetector.js";
import { generateBranchDiff } from "./git/branchDiff.js";
import { createIncrementalVerificationPlan } from "./git/incrementalVerificationPlanner.js";
import { analyzeDependencyImpact } from "./git/dependencyImpactGraph.js";
import { executeIncrementalVerification } from "./git/incrementalVerificationExecutor.js";
import { executeArtifactMerge } from "./merge/artifactMergeEngine.js";
import { validateArtifacts } from "./merge/artifactValidator.js";
import { validateOpenClawArtifacts } from "./artifactValidator.js";
import { createMergePlan, executeMergePlan } from "./mergeEngine.js";
import { regenerateInvalidArtifacts } from "./regenerationEngine.js";


import { loadState, saveState } from "./state.js";

const command = process.argv[2];
const arg = process.argv.slice(3).join(" ");

switch (command) {
  case "init-db": {
    initRuntimeDb()
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "init": {
    const state = loadState();
    saveState(state);
    createRunPlan();
    console.log("Factory run initialized.");
    console.log(JSON.stringify(loadState(), null, 2));
    break;
  }

  case "validate-dag": {
    const dag = loadDag();
    validateDag(dag);
    console.log("DAG is valid.");
    break;
  }

  case "request-approval": {
    const state = loadState();
    const approval = requestApproval(state.planVersion + 1);
    console.log("Plan approval requested.");
    console.log(JSON.stringify(approval, null, 2));
    break;
  }

  case "revise": {
    if (!arg) {
      throw new Error("Revision note is required.");
    }
    const approval = requestRevision(arg);
    console.log("Revision requested.");
    console.log(JSON.stringify(approval, null, 2));
    break;
  }

  case "approve": {
    const approval = approvePlan();
    console.log("Plan approved.");
    console.log(JSON.stringify(approval, null, 2));
    break;
  }

  case "verify-incremental": {
    executeIncrementalVerification(arg || "main")
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
        if (!result.success) process.exit(1);
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "impact-graph": {
    const changedProjects = process.argv.slice(3);
    const result = analyzeDependencyImpact(changedProjects);
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "verification-plan": {
    createIncrementalVerificationPlan(arg || "main")
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "branch-diff": {
    generateBranchDiff(arg || "main")
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "repo-graph": {
    const repos = detectGitRepos(process.cwd());
    console.log(JSON.stringify({
      success: true,
      total: repos.length,
      repos
    }, null, 2));
    break;
  }

  case "infra-preflight": {
    runInfraPreflight()
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
        if (!result.success) process.exit(1);
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "create-workspace": {
    if (!arg) {
      throw new Error("Project name is required.");
    }
    const workspace = createProjectWorkspace(arg);
    console.log("Project workspace created.");
    console.log(JSON.stringify(workspace, null, 2));
    break;
  }

  case "create-clones": {
    if (!arg) {
      throw new Error("Project name is required.");
    }
    const clones = [
      ...createEngineeringClones(arg),
      ...createValidationClones(arg)
    ];
    console.log("Agent clones created.");
    console.log(JSON.stringify(clones, null, 2));
    break;
  }

  case "execute-clones": {
    if (!arg) {
      throw new Error("Project name is required.");
    }

    executeAllClones(arg)
      .then((results) => {
        console.log("Parallel clone execution completed.");
        console.log(JSON.stringify(results, null, 2));
      })
      .catch(console.error);

    break;
  }

  case "validate-artifacts": {
    const [sourceDir] = process.argv.slice(3);
    if (!sourceDir) {
      throw new Error("Usage: validate-artifacts <sourceDir>");
    }

    const result = validateArtifacts(sourceDir);
    console.log(JSON.stringify(result, null, 2));
    if (!result.success) process.exit(1);
    break;
  }

  case "merge-dry-run": {
    if (!arg) {
      throw new Error("Project name is required.");
    }
    const plan = createMergePlan(arg, true);
    console.log("Merge dry-run completed.");
    console.log(JSON.stringify(plan, null, 2));
    break;
  }

  case "merge-artifacts": {
    const [sourceDir, targetDir, mode] = process.argv.slice(3);
    if (!sourceDir || !targetDir) {
      throw new Error("Usage: merge-artifacts <sourceDir> <targetDir> [--apply]");
    }

    const result = executeArtifactMerge(
      sourceDir,
      targetDir,
      mode !== "--apply"
    );

    console.log(JSON.stringify(result, null, 2));
    if (!result.success) process.exit(1);
    break;
  }

  case "regenerate-invalid": {
    if (!arg) {
      throw new Error("Project name is required.");
    }

    regenerateInvalidArtifacts(arg)
      .then((results) => {
        console.log("Invalid artifacts regenerated.");
        console.log(JSON.stringify(results, null, 2));
      })
      .catch(console.error);

    break;
  }

  

  case "synthesize-project": {
    if (!arg) throw new Error("Project name required");
    const result = synthesizeProject(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "patch-repo": {
    if (!arg) throw new Error("Project name required");
    const result = applyRepoPatches(arg.toLowerCase(), false);
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "build-project": {
    if (!arg) throw new Error("Project name required");
    const result = await runBuildPipeline(
      `${process.cwd()}/projects/${arg.toLowerCase()}`
    );
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "materialize-app": {
    if (!arg) throw new Error("Project name required");
    const result = materializeDeployableApp(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "validate-deploy-readiness": {
    if (!arg) throw new Error("Project name required");
    const result = validateDeployReadiness(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "security-gate": {
    if (!arg) throw new Error("Project name required");
    const result = await runSecurityGate(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "clean-rebuild-gate": {
    if (!arg) throw new Error("Project name required");
    const result = await runCleanRebuildGate(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "repair-project": {
    if (!arg) throw new Error("Project name required");
    const result = await runAutonomousFailureRepair(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "safe-patch-demo": {
    if (!arg) throw new Error("Project name required");
    const result = await applySafeRepoPatches(arg.toLowerCase(), [
      {
        targetFile: "backend/src/main/resources/application.yml",
        reason: "Add explicit app identity for safe patch engine demo",
        content: `server:
  port: 8080

spring:
  application:
    name: nearjobs

management:
  endpoints:
    web:
      exposure:
        include: health,info
`
      }
    ]);
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "smart-delivery": {
    const result = await runSmartFleetDelivery();
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "dashboard": {
    console.log(JSON.stringify(generateAutonomousDashboard(), null, 2));
    break;
  }

  case "autonomous-health-gate": {
    console.log(JSON.stringify(runAutonomousHealthGate(), null, 2));
    break;
  }

  case "autonomous-health": {
    console.log(JSON.stringify(getAutonomousHealth(), null, 2));
    break;
  }

  case "failure-trends": {
    console.log(JSON.stringify(getFailureTrends(), null, 2));
    break;
  }

  case "failure-analytics": {
    console.log(JSON.stringify(getFailureAnalytics(), null, 2));
    break;
  }

  case "daemon-metrics": {
    console.log(JSON.stringify(getDaemonMetrics(), null, 2));
    break;
  }

  case "daemon-logs": {
    const fs = await import("fs");
    const path = await import("path");

    const logFile = path.resolve(process.cwd(), "runtime/logs/factory.log");

    if (!fs.existsSync(logFile)) {
      console.log("No daemon/factory log found.");
      break;
    }

    const lines = fs.readFileSync(logFile, "utf8").split("\n").slice(-80);
    console.log(lines.join("\n"));
    break;
  }

  case "daemon-status": {
    console.log(JSON.stringify(loadDaemonState(), null, 2));
    break;
  }

  case "smart-daemon": {
    await startSmartDaemon();
    break;
  }

  case "daemon-once": {
    const result = await runDaemonOnce();
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "fleet-delivery": {
    const result = await runFleetDelivery();
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "continuous-delivery": {
    if (!arg) throw new Error("Project name required");

    const { runDelivery } = await import("./deliveryCommand.js");

    const result = await runDelivery(arg.toLowerCase());

    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "deliver": {
    if (!arg) throw new Error("Project name required");
    const result = await runDelivery(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "release-manifest": {
    if (!arg) throw new Error("Project name required");
    const result = await generateReleaseManifest(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "release-report": {
    if (!arg) throw new Error("Project name required");
    const result = await generateReleaseReport(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "verify-project": {
    if (!arg) throw new Error("Project name required");
    const result = await runProjectVerificationGate(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "playwright-gate": {
    if (!arg) throw new Error("Project name required");
    const result = await runPlaywrightGate(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "build-gate": {
    if (!arg) throw new Error("Project name required");
    const result = await runBuildVerificationGate(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "api-smoke": {
    const result = await runApiSmokeGate();
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "self-heal-runtime": {
    if (!arg) throw new Error("Project name required");
    const result = await runSelfHealingRuntimeLoop(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "validate-runtime": {
    const result = await validateRuntime();
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "auto-fix": {
    if (!arg) throw new Error("Project name required");
    const result = await runAutoFixLoop(arg.toLowerCase());
    console.log(JSON.stringify(result, null, 2));
    break;
  }


  case "run-approved": {
    const results = runApprovedDagOnce();
    console.log("Approved DAG execution completed.");
    console.log(JSON.stringify(results, null, 2));
    break;
  }

  case "state": {
    console.log(JSON.stringify(loadState(), null, 2));
    break;
  }

  default:
    console.log(`Usage:
  tsx orchestrator/src/factoryCli.ts init
  tsx orchestrator/src/factoryCli.ts validate-dag
  tsx orchestrator/src/factoryCli.ts request-approval
  tsx orchestrator/src/factoryCli.ts revise "change note"
  tsx orchestrator/src/factoryCli.ts approve
  tsx orchestrator/src/factoryCli.ts create-workspace "NearJobs"\n  tsx orchestrator/src/factoryCli.ts create-clones "NearJobs"\n  tsx orchestrator/src/factoryCli.ts run-approved\n  tsx orchestrator/src/factoryCli.ts repo-graph\n  tsx orchestrator/src/factoryCli.ts state`);
}
