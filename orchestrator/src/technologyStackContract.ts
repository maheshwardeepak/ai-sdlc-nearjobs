import fs from "fs";
import path from "path";
import stackCatalog from "./stack-catalog.json" with { type: "json" };

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


function sameObject(expected: Record<string, string>, actual: Record<string, string>): boolean {
  return Object.entries(expected).every(([key, value]) => actual?.[key] === value);
}

function validateAgainstCatalog(contract: TechnologyStackContract): string | null {
  const backendSupported = stackCatalog.backend.some((item) =>
    sameObject(item, contract.backend)
  );

  if (!backendSupported) {
    return `unsupported-backend-stack: ${contract.backend.language}/${contract.backend.framework}/${contract.backend.runtime}/${contract.backend.packageManager}`;
  }

  const frontendSupported = stackCatalog.frontend.some((item) =>
    sameObject(item, contract.frontend)
  );

  if (!frontendSupported) {
    return `unsupported-frontend-stack: ${contract.frontend.language}/${contract.frontend.framework}/${contract.frontend.runtime}/${contract.frontend.packageManager}`;
  }

  const databaseSupported = stackCatalog.database.some((item) =>
    item.engine === contract.database.engine
  );

  if (!databaseSupported) {
    return `unsupported-database-stack: ${contract.database.engine}`;
  }

  return null;
}


export function createTechnologyStackContract(
  contract: Omit<TechnologyStackContract, "createdAt" | "confirmed">
): TechnologyStackContract {
  const finalContract: TechnologyStackContract = {
    ...contract,
    confirmed: true,
    createdAt: new Date().toISOString()
  };

  const catalogError = validateAgainstCatalog(finalContract);

  if (catalogError) {
    throw new Error(catalogError);
  }

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

  const hasRequiredFields =
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

  if (!hasRequiredFields) {
    return {
      success: false,
      contract,
      error: "technology-stack-contract-incomplete"
    };
  }

  const catalogError = validateAgainstCatalog(contract);

  return {
    success: !catalogError,
    contract,
    error: catalogError
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
