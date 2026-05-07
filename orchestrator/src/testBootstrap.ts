import path from "path";
import { bootstrapProject } from "./projectBootstrap";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const factoryRoot = path.resolve(__dirname, "../..");

const result = bootstrapProject(
  "Create a hyperlocal job marketplace called TestJobs with jobseeker and employer roles",
  factoryRoot
);

console.log(JSON.stringify(result, null, 2));