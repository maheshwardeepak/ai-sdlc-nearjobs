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

export function createDefaultTechnologyStackContract(): TechnologyStackContract {
  const contract: TechnologyStackContract = {
    backend: {
      language: "TypeScript",
      framework: "Express",
      runtime: "Node.js",
      packageManager: "npm"
    },
    frontend: {
      language: "TypeScript",
      framework: "React",
      runtime: "Vite",
      packageManager: "npm"
    },
    database: {
      engine: "PostgreSQL"
    },
    confirmed: true,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "technology-stack-contract.json"),
    JSON.stringify(contract, null, 2)
  );

  return contract;
}

if (process.argv[1]?.includes("technologyStackContract")) {
  console.log(JSON.stringify(createDefaultTechnologyStackContract(), null, 2));
}


export function validateTechnologyStackContract() {
  const contractPath = path.resolve(
    process.cwd(),
    "artifacts/reports/technology-stack-contract.json"
  );

  if (!fs.existsSync(contractPath)) {
    return {
      success: false,
      error: "technology-stack-contract-not-found"
    };
  }

  const contract = JSON.parse(
    fs.readFileSync(contractPath, "utf8")
  ) as TechnologyStackContract;

  const success =
    Boolean(contract.confirmed) &&
    Boolean(contract.backend?.language) &&
    Boolean(contract.backend?.framework) &&
    Boolean(contract.frontend?.language) &&
    Boolean(contract.frontend?.framework) &&
    Boolean(contract.database?.engine);

  return {
    success,
    contract,
    error: success ? null : "technology-stack-contract-incomplete"
  };
}
