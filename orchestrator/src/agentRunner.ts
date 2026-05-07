import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { getModelForAgent } from "./modelRouter";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


type RunAgentInput = {
  agentName: string;
  input: string;
  runDir: string;
  step: number;
};

export async function runAgent({
  agentName,
  input,
  runDir,
  step
}: RunAgentInput): Promise<string> {
  const model = getModelForAgent(agentName);

  const factoryRoot = path.resolve(__dirname, "../..");

  let agentRulesPath = path.join(
    factoryRoot,
    "agents",
    agentName,
    "AGENTS.md"
  );

  // fallback for dynamic workers
  if (!fs.existsSync(agentRulesPath) && agentName.endsWith("-worker")) {
    agentRulesPath = path.join(
      factoryRoot,
      "agents",
      "nearjobs-worker",
      "AGENTS.md"
    );
  }

  const globalRulesPath = path.join(
    factoryRoot,
    "GLOBAL_RULES.md"
  );

  const agentRules = fs.existsSync(agentRulesPath)
    ? fs.readFileSync(agentRulesPath, "utf8")
    : "";

  const globalRules = fs.existsSync(globalRulesPath)
    ? fs.readFileSync(globalRulesPath, "utf8")
    : "";

  const stepFile = path.join(
    runDir,
    `${String(step).padStart(2, "0")}_${agentName}.txt`
  );

  const message = [
    `You are ${agentName}.`,
    `Model tier requested by orchestrator: ${model}.`,
    "",
    "GLOBAL RULES:",
    globalRules,
    "",
    "AGENT RULES:",
    agentRules,
    "",
    "TASK INPUT:",
    input,
    "",
    "Follow your agent role strictly."
  ].join("\n");

  return new Promise((resolve) => {
    const args = [
      "agent",
      "--agent",
      agentName,
      "--message",
      message
    ];

    console.log(`\n==============================`);
    console.log(`STARTING AGENT: ${agentName}`);
    console.log(`MODEL: ${model}`);
    console.log(`==============================\n`);

    const child = spawn("openclaw", args, {
      cwd: factoryRoot,
      shell: false
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      const text = data.toString();

      stdout += text;

      process.stdout.write(
        `[${agentName}] ${text}`
      );
    });

    child.stderr.on("data", (data) => {
      const text = data.toString();

      stderr += text;

      process.stderr.write(
        `[${agentName} ERROR] ${text}`
      );
    });

    child.on("close", (code) => {
      const result = stdout || stderr || "";

      fs.writeFileSync(stepFile, result, "utf8");

      console.log(`\n------------------------------`);
      console.log(`AGENT COMPLETED: ${agentName}`);
      console.log(`EXIT CODE: ${code}`);
      console.log(`OUTPUT FILE: ${stepFile}`);
      console.log(`------------------------------\n`);

      if (code !== 0) {
        resolve(
          JSON.stringify({
            agent: agentName,
            status: "error",
            exitCode: code,
            error: stderr || stdout
          })
        );

        return;
      }

      resolve(result);
    });

    child.on("error", (error) => {
      const err = String(error);

      fs.writeFileSync(stepFile, err, "utf8");

      resolve(
        JSON.stringify({
          agent: agentName,
          status: "spawn_error",
          error: err
        })
      );
    });
  });
}