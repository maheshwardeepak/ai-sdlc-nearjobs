import type { PipelineMode } from "./pipelines";

export function detectMode(input: string): PipelineMode {
  const text = input.toLowerCase().trim();

  if (text.includes("mode: bug_fix")) return "bug_fix";
  if (text.includes("mode: new_feature")) return "new_feature";
  if (text.includes("mode: correction_feedback")) return "correction_feedback";

  if (
    text.includes("bug:") ||
    text.includes("fix this error") ||
    text.includes("debug this") ||
    text.includes("not working")
  ) return "bug_fix";

  if (
    text.includes("add feature") ||
    text.includes("new feature") ||
    text.includes("enhance existing")
  ) return "new_feature";

  return "new_project";
}
