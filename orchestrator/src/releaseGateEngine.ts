import fs from "fs";
import path from "path";

type DeliveryScore = {
  success: boolean;
  score: number;
  grade: string;
};

type RegressionAnalysis = {
  success: boolean;
  regressionDetected: boolean;
};

type ReleaseGateReport = {
  success: boolean;
  releaseAllowed: boolean;
  minimumScore: number;
  currentScore: number;
  regressionDetected: boolean;
  reasons: string[];
  createdAt: string;
};

function readJson(file: string) {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), "artifacts/reports", file),
      "utf8"
    )
  );
}

export function evaluateReleaseGate(
  minimumScore = 90
): ReleaseGateReport {
  const delivery =
    readJson("delivery-score-report.json") as DeliveryScore;

  const regression =
    readJson("regression-analysis-report.json") as RegressionAnalysis;

  const reasons: string[] = [];

  if (delivery.score < minimumScore) {
    reasons.push(
      `delivery-score-below-threshold:${delivery.score}`
    );
  }

  if (regression.regressionDetected) {
    reasons.push("regression-detected");
  }

  if (!delivery.success) {
    reasons.push("delivery-score-failed");
  }

  const report: ReleaseGateReport = {
    success: reasons.length === 0,
    releaseAllowed: reasons.length === 0,
    minimumScore,
    currentScore: delivery.score,
    regressionDetected: regression.regressionDetected,
    reasons,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(
    process.cwd(),
    "artifacts/reports"
  );

  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "release-gate-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("releaseGateEngine")) {
  const minimum = Number(process.argv[2] || 90);

  const result = evaluateReleaseGate(minimum);

  console.log(JSON.stringify(result, null, 2));

  if (!result.releaseAllowed) {
    process.exit(1);
  }
}
