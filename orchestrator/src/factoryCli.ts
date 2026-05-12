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
import { createDeliveryScore } from "./deliveryScore.js";
import { createAgentPerformanceReport } from "./agentPerformanceScore.js";
import { createRegressionAnalysis } from "./regressionAnalysis.js";
import { createDefaultPolicy, validateFactoryPolicy } from "./policyEngine.js";
import { verifyPolicyCompliance } from "./policyComplianceVerifier.js";
import { verifySecurityAudit } from "./securityAuditVerifier.js";
import { verifySecretScanning } from "./secretScanningVerifier.js";
import { verifyDockerCompliance } from "./dockerComplianceVerifier.js";
import { verifyTestCoverage } from "./testCoverageVerifier.js";
import { evaluateReleaseGate } from "./releaseGateEngine.js";
import { generateSbom } from "./sbomGenerator.js";
import { verifySbomPolicy } from "./sbomPolicyVerifier.js";
import { verifyTestExecution } from "./testExecutionVerifier.js";
import { verifySast } from "./sastVerifier.js";
import { generateRemediationPlan } from "./remediationEngine.js";
import { executeSelfHealing } from "./selfHealingEngine.js";
import { executeDeployment } from "./deploymentEngine.js";
import { createDefaultTechnologyStackContract, validateTechnologyStackContract } from "./technologyStackContract.js";
import { verifyGeneratedApps } from "./generatedAppBuildVerifier.js";
import { verifyGeneratedBackendRuntime } from "./generatedBackendRuntimeVerifier.js";
import { verifyGeneratedCrudIntegration } from "./generatedCrudIntegrationVerifier.js";
import { startRuntimeApi } from "./server/runtimeApi.js";
import { initRuntimeDb, recordFactoryExecution, listFactoryExecutions, recordAgentRun, listAgentRuns, recordVerificationRun, listVerificationRuns } from "./db/runtimeDb.js";
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
  case "record-verification-run": {
    const [checkName, success, logFile] = process.argv.slice(3);

    if (!checkName || success === undefined) {
      throw new Error("Usage: record-verification-run <checkName> <true|false> [logFile]");
    }

    recordVerificationRun({
      checkName,
      success: success === "true",
      logFile
    })
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "list-verification-runs": {
    listVerificationRuns()
      .then((rows) => {
        console.log(JSON.stringify(rows, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "record-agent-run": {
    const [agent, role, workerId, status, outputFile] = process.argv.slice(3);

    if (!agent || !status) {
      throw new Error("Usage: record-agent-run <agent> <role> <workerId> <status> [outputFile]");
    }

    recordAgentRun({
      agent,
      role,
      workerId,
      status,
      outputFile
    })
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "list-agent-runs": {
    listAgentRuns()
      .then((rows) => {
        console.log(JSON.stringify(rows, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "record-execution": {
    const projectName = arg || null;
    recordFactoryExecution({
      projectName,
      status: "RECORDED",
      planVersion: 1
    })
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "list-executions": {
    listFactoryExecutions()
      .then((rows) => {
        console.log(JSON.stringify(rows, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "runtime-api": {
    startRuntimeApi().catch((error) => {
      console.error(error);
      process.exit(1);
    });
    break;
  }

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

  case "verify-generated-crud": {
    verifyGeneratedCrudIntegration(arg || "runtime/workspaces")
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "verify-generated-backend-runtime": {
    verifyGeneratedBackendRuntime(arg || "runtime/workspaces")
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "verify-generated-apps": {
    verifyGeneratedApps(arg || "runtime/workspaces")
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "validate-stack-contract": {
    const result = validateTechnologyStackContract();
    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      process.exit(1);
    }

    break;
  }

  case "deploy": {
    const result = executeDeployment(
      (arg as "local-docker" | "staging" | "production") ||
      "local-docker"
    );

    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      process.exit(1);
    }

    break;
  }

  case "execute-self-healing": {
    const result = executeSelfHealing();

    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      process.exit(1);
    }

    break;
  }

  case "generate-remediation-plan": {
    const result = generateRemediationPlan();

    console.log(JSON.stringify(result, null, 2));

    break;
  }

  case "verify-sast": {
    const result = verifySast(
      arg || "runtime/workspaces"
    );

    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      process.exit(1);
    }

    break;
  }

  case "verify-test-execution": {
    const result = verifyTestExecution(
      arg || "runtime/workspaces"
    );

    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      process.exit(1);
    }

    break;
  }

  case "verify-sbom-policy": {
    const result = verifySbomPolicy();

    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      process.exit(1);
    }

    break;
  }

  case "generate-sbom": {
    const result = generateSbom(
      arg || "runtime/workspaces"
    );

    console.log(JSON.stringify(result, null, 2));

    break;
  }

  case "release-gate": {
    const result = evaluateReleaseGate(
      Number(arg || 90)
    );

    console.log(JSON.stringify(result, null, 2));

    if (!result.releaseAllowed) {
      process.exit(1);
    }

    break;
  }

  case "verify-test-coverage": {
    const result = verifyTestCoverage(arg || "runtime/workspaces");

    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      process.exit(1);
    }

    break;
  }

  case "verify-docker-compliance": {
    const result = verifyDockerCompliance(arg || "runtime/workspaces");

    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      process.exit(1);
    }

    break;
  }

  case "verify-secret-scan": {
    const result = verifySecretScanning(arg || "runtime/workspaces");

    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      process.exit(1);
    }

    break;
  }

  case "verify-security-audit": {
    verifySecurityAudit(arg || "runtime/workspaces")
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "verify-policy-compliance": {
    const result = verifyPolicyCompliance(arg || "runtime/workspaces");
    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      process.exit(1);
    }

    break;
  }

  case "validate-policy": {
    const result = validateFactoryPolicy();
    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      process.exit(1);
    }

    break;
  }

  case "policy-engine": {
    const result = createDefaultPolicy();
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "stack-contract": {
    const result = createDefaultTechnologyStackContract();
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "regression-analysis": {
    const result = createRegressionAnalysis();
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "agent-performance": {
    createAgentPerformanceReport()
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    break;
  }

  case "delivery-score": {
    const result = createDeliveryScore();
    console.log(JSON.stringify(result, null, 2));
    break;
  }

  case "verify-factory-full": {
    const checks = [
      "typecheck",
      "autonomous-health-gate",
      "validate-stack-contract",
      "validate-policy",
      "verify-policy-compliance",
      "verify-security-audit",
      "verify-secret-scan",
      "verify-sast",
      "verify-docker-compliance",
      "verify-test-coverage",
      "verify-test-execution",
      "generated-crud-verification",
      "generate-sbom",
      "verify-sbom-policy",
      "release-gate",
      "deploy",
      "generate-remediation-plan",
      "execute-self-healing"
    ];

    const { runTask } = await import("./taskRuntime.js");

    const results = [];

    for (const check of checks) {
      const command =
        check === "typecheck"
          ? { command: "pnpm", args: ["exec", "tsc", "-p", "orchestrator/tsconfig.json", "--noEmit"] }
          : check === "autonomous-health-gate"
            ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "autonomous-health-gate"] }
            : check === "validate-stack-contract"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "validate-stack-contract"] }
              : check === "validate-policy"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "validate-policy"] }
              : check === "verify-policy-compliance"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "verify-policy-compliance", "runtime/workspaces/crudbackendgenerationtest"] }
              : check === "verify-security-audit"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "verify-security-audit", "runtime/workspaces/crudbackendgenerationtest"] }
              : check === "verify-secret-scan"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "verify-secret-scan", "runtime/workspaces/crudbackendgenerationtest"] }
              : check === "verify-sast"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "verify-sast", "runtime/workspaces/dockercompliancegenerationtest"] }
              : check === "verify-docker-compliance"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "verify-docker-compliance", "runtime/workspaces/dockercompliancegenerationtest"] }
              : check === "verify-test-coverage"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "verify-test-coverage", "runtime/workspaces/dockercompliancegenerationtest"] }
              : check === "verify-test-execution"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "verify-test-execution", "runtime/workspaces/dockercompliancegenerationtest"] }
              : check === "release-gate"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "release-gate"] }
              : check === "deploy"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "deploy", "local-docker"] }
              : check === "generate-remediation-plan"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "generate-remediation-plan"] }
              : check === "execute-self-healing"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "execute-self-healing"] }
              : check === "generate-sbom"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "generate-sbom", "runtime/workspaces/dockercompliancegenerationtest"] }
              : check === "verify-sbom-policy"
              ? { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "verify-sbom-policy"] }
              : { command: "pnpm", args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "verify-generated-crud", "runtime/workspaces/crudbackendgenerationtest"] };

      const result = await runTask({
        id: `factory-full-${check}`,
        name: `Factory full verification ${check}`,
        cwd: process.cwd(),
        command: command.command,
        args: command.args
      });

      results.push({
        check,
        success: result.success,
        logFile: result.logFile
      });
    }

    const output = {
      success: results.every((result) => result.success),
      checks,
      results,
      createdAt: new Date().toISOString()
    };

    const fs = await import("fs");
    const path = await import("path");

    const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportsDir, "factory-full-verification-report.json"),
      JSON.stringify(output, null, 2)
    );

    console.log(JSON.stringify(output, null, 2));

    if (!output.success) {
      process.exit(1);
    }

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
