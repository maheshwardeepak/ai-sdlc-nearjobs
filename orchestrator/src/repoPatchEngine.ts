import fs from "fs";
import path from "path";

export type RepoPatch = {
  source: string;
  destination: string;
};

export function applyRepoPatches(projectName: string, dryRun = true): RepoPatch[] {
  const synthRoot = path.resolve(process.cwd(), "projects", projectName, "_synthesized");
  const repoRoot = path.resolve(process.cwd(), "projects", projectName, "generated");

  if (!fs.existsSync(synthRoot)) {
    throw new Error(`Synthesized root not found: ${synthRoot}`);
  }

  const patches: RepoPatch[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        walk(full);
      } else {
        const relative = path.relative(synthRoot, full);
        const destination = path.join(repoRoot, relative);

        patches.push({ source: full, destination });

        if (!dryRun) {
          fs.mkdirSync(path.dirname(destination), { recursive: true });
          fs.copyFileSync(full, destination);
        }
      }
    }
  }

  walk(synthRoot);
  return patches;
}
