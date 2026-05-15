export type PhaseArtifact = {
  path: string;
  content: string;
};

export function extractPhaseArtifacts(markdown: string): PhaseArtifact[] {
  const artifacts: PhaseArtifact[] = [];

  const regex = /```(?:[a-zA-Z0-9_-]+)?\s*file:([^\n]+)\n([\s\S]*?)```/g;

  for (const match of markdown.matchAll(regex)) {
    const filePath = match[1]?.trim();
    const content = match[2] ?? "";

    if (!filePath) {
      continue;
    }

    artifacts.push({
      path: filePath,
      content
    });
  }

  return artifacts;
}
