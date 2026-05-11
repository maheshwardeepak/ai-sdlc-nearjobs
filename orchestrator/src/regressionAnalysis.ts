import fs from "fs";
import path from "path";

type DeliveryScore = {
  success: boolean;
  score: number;
  grade: string;
  createdAt: string;
};

export function createRegressionAnalysis() {
  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  const historyPath = path.join(reportsDir, "delivery-score-history.json");

  const history = fs.existsSync(historyPath)
    ? JSON.parse(fs.readFileSync(historyPath, "utf8")) as DeliveryScore[]
    : [];

  const previous = history.length >= 2 ? history[history.length - 2] : null;
  const latest = history.length >= 1 ? history[history.length - 1] : null;

  const delta = latest && previous ? latest.score - previous.score : 0;
  const regressionDetected = delta < 0;

  const report = {
    success: true,
    regressionDetected,
    latest,
    previous,
    delta,
    createdAt: new Date().toISOString()
  };

  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportsDir, "regression-analysis-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("regressionAnalysis")) {
  try {
    console.log(JSON.stringify(createRegressionAnalysis(), null, 2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
