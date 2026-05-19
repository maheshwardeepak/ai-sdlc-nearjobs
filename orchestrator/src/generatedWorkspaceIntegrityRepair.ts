import fs from "node:fs";
import path from "node:path";

function trimAfterLast(file: string, marker: string) {
  if (!fs.existsSync(file)) return false;

  const text = fs.readFileSync(file, "utf8");
  const end = text.lastIndexOf(marker);
  if (end === -1) return false;

  const fixed = text.slice(0, end + marker.length).trimEnd() + "\n";
  if (fixed !== text) {
    fs.writeFileSync(file, fixed);
    return true;
  }

  return false;
}

function sanitizeEnv(file: string) {
  if (!fs.existsSync(file)) return false;

  const text = fs.readFileSync(file, "utf8");
  const fixed = text
    .split(/\r?\n/)
    .map((line) =>
      line.trimStart().startsWith("//")
        ? "# " + line.trimStart().slice(2).trim()
        : line
    )
    .join("\n");

  if (fixed !== text) {
    fs.writeFileSync(file, fixed.endsWith("\n") ? fixed : fixed + "\n");
    return true;
  }

  return false;
}

export function repairGeneratedWorkspaceIntegrity(workspaceRoot: string) {
  const repaired: string[] = [];

  for (const file of [
    path.join(workspaceRoot, "backend", "pom.xml"),
    path.join(workspaceRoot, "pom.xml")
  ]) {
    if (trimAfterLast(file, "</project>")) repaired.push(file);
  }

  for (const file of [
    path.join(workspaceRoot, ".env"),
    path.join(workspaceRoot, ".env.example"),
    path.join(workspaceRoot, "backend", ".env.example"),
    path.join(workspaceRoot, "frontend", ".env.example")
  ]) {
    if (sanitizeEnv(file)) repaired.push(file);
  }

  return { success: true, repaired };
}
