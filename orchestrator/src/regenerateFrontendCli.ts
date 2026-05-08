import { executeOpenClawTask } from "./openclawAdapter.js";
import path from "path";

const workerId = "engineering-agent-frontend-1778155697655";
const workspacePath = path.resolve(
  process.cwd(),
  "runtime/workspaces/nearjobs/workers",
  workerId
);

const result = await executeOpenClawTask({
  workerId,
  workspacePath,
  prompt: `
You are a principal frontend engineer with 30 years of experience.

Regenerate the NearJobs frontend artifact.

The previous frontend artifact failed validation because it contained TODO/placeholder language.

Hard rules:
- Do not use the word TODO anywhere.
- Do not use the word placeholder anywhere.
- Do not use the word scaffold anywhere.
- Do not use the word stub anywhere.
- Do not write "return null".
- Do not write "return undefined".
- Do not describe incomplete work.
- Do not say "implement later".
- Do not say "mock implementation".
- Produce production-grade frontend implementation only.

Project:
NearJobs hyperlocal hiring platform.

Frontend stack:
React, Vite, TypeScript, Tailwind, Playwright.

Return a complete frontend implementation plan and concrete code artifacts:
- routing
- auth state
- API client
- layout system
- job search page
- job details page
- registration/login pages
- employer dashboard
- candidate dashboard
- application flow
- admin screens
- form validation
- responsive UI
- accessibility
- Playwright-friendly selectors
- production build considerations

Output must be detailed and ready for synthesis into files.
`
});

console.log(JSON.stringify(result, null, 2));
