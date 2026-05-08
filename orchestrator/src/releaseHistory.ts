import fs from "fs";
import path from "path";

export function updateReleaseHistory(projectName: string, manifest: any) {
  const releaseDir = path.resolve(process.cwd(), "artifacts/releases");
  fs.mkdirSync(releaseDir, { recursive: true });

  const historyPath = path.join(releaseDir, `${projectName}-release-history.json`);

  const history = fs.existsSync(historyPath)
    ? JSON.parse(fs.readFileSync(historyPath, "utf8"))
    : [];

  history.push({
    version: manifest.version,
    commit: manifest.commit,
    branch: manifest.branch,
    generatedAt: manifest.generatedAt,
    readyForDelivery: manifest.readyForDelivery,
    gates: manifest.gates
  });

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  return {
    historyPath,
    totalReleases: history.length
  };
}
