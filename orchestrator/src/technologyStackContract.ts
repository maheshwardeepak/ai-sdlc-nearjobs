import fs from "fs";
import path from "path";

export type TechnologyStackContract = {
  backend: {
    language: string;
    framework: string;
    runtime: string;
    packageManager: string;
  };
  frontend: {
    language: string;
    framework: string;
    runtime: string;
    packageManager: string;
  };
  database: {
    engine: string;
  };
  confirmed: boolean;
  createdAt: string;
};

const STACK_CONTRACT_PATH = path.resolve(
  process.cwd(),
  "artifacts/reports/technology-stack-contract.json"
);

export function createTechnologyStackContract(
  contract: Omit<TechnologyStackContract, "createdAt" | "confirmed">
): TechnologyStackContract {
  const finalContract: TechnologyStackContract = {
    ...contract,
    confirmed: true,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.dirname(STACK_CONTRACT_PATH);
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    STACK_CONTRACT_PATH,
    JSON.stringify(finalContract, null, 2)
  );

  return finalContract;
}

export function validateTechnologyStackContract() {
  if (!fs.existsSync(STACK_CONTRACT_PATH)) {
    return {
      success: false,
      contract: null,
      error: "technology-stack-contract-not-found"
    };
  }

  const contract = JSON.parse(
    fs.readFileSync(STACK_CONTRACT_PATH, "utf8")
  ) as TechnologyStackContract;

  const success =
    Boolean(contract.confirmed) &&
    Boolean(contract.backend?.language) &&
    Boolean(contract.backend?.framework) &&
    Boolean(contract.backend?.runtime) &&
    Boolean(contract.backend?.packageManager) &&
    Boolean(contract.frontend?.language) &&
    Boolean(contract.frontend?.framework) &&
    Boolean(contract.frontend?.runtime) &&
    Boolean(contract.frontend?.packageManager) &&
    Boolean(contract.database?.engine);

  return {
    success,
    contract,
    error: success ? null : "technology-stack-contract-incomplete"
  };
}

export function loadTechnologyStackContract() {
  const validation = validateTechnologyStackContract();

  if (!validation.success || !validation.contract) {
    throw new Error(validation.error || "technology-stack-contract-invalid");
  }

  return validation.contract;
}

export function ensureTechnologyStackConfirmed() {
  const validation = validateTechnologyStackContract();

  if (!validation.success || !validation.contract) {
    throw new Error(
      [
        "Technology stack confirmation required.",
        "Missing required selections:",
        "- backend language/framework/runtime/packageManager",
        "- frontend language/framework/runtime/packageManager",
        "- database engine"
      ].join("\n")
    );
  }

  return validation.contract;
}

if (process.argv[1]?.includes("technologyStackContract")) {
  console.log(
    JSON.stringify(validateTechnologyStackContract(), null, 2)
  );
}
