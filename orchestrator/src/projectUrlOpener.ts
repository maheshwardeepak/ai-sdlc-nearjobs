import { execSync } from "node:child_process";

export function openProjectUrls(input: {
  frontendUrl?: string;
  backendUrl?: string;
}) {
  const urls = [input.frontendUrl, input.backendUrl].filter(Boolean) as string[];

  for (const url of urls) {
    try {
      execSync(`open "${url}"`, {
        stdio: "ignore",
        shell: "/bin/bash"
      });
    } catch {
      // safe no-op for headless/non-mac environments
    }
  }

  return {
    success: true,
    opened: urls
  };
}
