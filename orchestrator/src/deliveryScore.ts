import fs from "fs";
import path from "path";

type CheckResult = {
  check: string;
  success: boolean;
  logFile: string;
};

type FactoryFullReport = {
  success: boolean;
  checks: string[];
  results: CheckResult[];
  createdAt: string;
};

function gradeForScore(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  return "F";
}

export function createDeliveryScore() {
  const reportPath = path.resolve(
    process.cwd(),
    "artifacts/reports/factory-full-verification-report.json"
  );

  if (!fs.existsSync(reportPath)) {
    throw new Error("factory-full-verification-report-not-found");
  }

  const report = JSON.parse(
    fs.readFileSync(reportPath, "utf8")
  ) as FactoryFullReport;

  const checkScores = Object.fromEntries(
    report.results.map((result) => [
      result.check,
      result.success ? 100 : 0
    ])
  );

  const score =
    report.results.length === 0
      ? 0
      : Math.round(
          report.results.reduce(
            (total, result) => total + (result.success ? 100 : 0),
            0
          ) / report.results.length
        );

  const output = {
    success: report.success,
    score,
    grade: gradeForScore(score),
    checks: checkScores,
    sourceReport: reportPath,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "delivery-score-report.json"),
    JSON.stringify(output, null, 2)
  );

  return output;
}

if (process.argv[1]?.includes("deliveryScore")) {
  try {
    console.log(JSON.stringify(createDeliveryScore(), null, 2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
