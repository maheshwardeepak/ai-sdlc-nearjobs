import fs from "fs";
import path from "path";

export type SynthesizedFile = {
  sourceArtifact: string;
  targetFile: string;
  bytes: number;
};

function ensureDir(file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function extractCodeBlocks(markdown: string) {
  const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const blocks: { language: string; code: string }[] = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({ language: match[1] ?? "txt", code: match[2] ?? "" });
  }
  return blocks;
}

function inferExtension(language: string): string {
  const map: Record<string, string> = {
    ts: ".ts",
    tsx: ".tsx",
    js: ".js",
    jsx: ".jsx",
    java: ".java",
    sql: ".sql",
    yaml: ".yaml",
    yml: ".yml",
    json: ".json",
    sh: ".sh",
    md: ".md",
    css: ".css",
    html: ".html"
  };
  return map[language] || ".txt";
}

export function synthesizeProject(projectName: string): SynthesizedFile[] {
  const artifactRoot = path.resolve(process.cwd(), "projects", projectName, "_ai_artifacts");
  const synthRoot = path.resolve(process.cwd(), "projects", projectName, "_synthesized");

  if (!fs.existsSync(artifactRoot)) {
    throw new Error(`Artifact root not found: ${artifactRoot}`);
  }

  const outputs: SynthesizedFile[] = [];

  const artifacts = fs.readdirSync(artifactRoot).filter((f) => f.endsWith(".md"));

  for (const artifact of artifacts) {
    const artifactPath = path.join(artifactRoot, artifact);
    const markdown = fs.readFileSync(artifactPath, "utf8");
    const codeBlocks = extractCodeBlocks(markdown);

    codeBlocks.forEach((block, index) => {
      const ext = inferExtension(block.language);
      const file = path.join(
        synthRoot,
        artifact.replace(".md", ""),
        `generated-${index + 1}${ext}`
      );

      ensureDir(file);
      fs.writeFileSync(file, block.code);

      outputs.push({
        sourceArtifact: artifact,
        targetFile: file,
        bytes: Buffer.byteLength(block.code)
      });
    });
  }

  return outputs;
}
