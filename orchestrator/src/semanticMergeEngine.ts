import fs from "node:fs";

export type SemanticMergeResult = {
  success: boolean;
  merged: boolean;
  content: string;
  strategy: "create" | "replace" | "append";
};

function normalize(content: string): string {
  return content.trim().replace(/\r\n/g, "\n");
}

export function semanticMergeFile(
  existingContent: string | null,
  incomingContent: string
): SemanticMergeResult {
  const incoming = normalize(incomingContent);

  if (!existingContent) {
    return {
      success: true,
      merged: false,
      content: incoming,
      strategy: "create"
    };
  }

  const existing = normalize(existingContent);

  if (existing === incoming) {
    return {
      success: true,
      merged: true,
      content: existing,
      strategy: "replace"
    };
  }

  if (existing.includes(incoming)) {
    return {
      success: true,
      merged: true,
      content: existing,
      strategy: "replace"
    };
  }

  if (incoming.includes(existing)) {
    return {
      success: true,
      merged: true,
      content: incoming,
      strategy: "replace"
    };
  }

  const merged = [
    existing,
    "",
    "// ===== AI MERGE APPEND =====",
    "",
    incoming
  ].join("\n");

  return {
    success: true,
    merged: true,
    content: merged,
    strategy: "append"
  };
}

export function loadExistingFile(file: string): string | null {
  if (!fs.existsSync(file)) {
    return null;
  }

  return fs.readFileSync(file, "utf8");
}
