import { loadTechnologyStackContract } from "./technologyStackContract.js";
import { loadStackProofMatrix } from "./stackProofMatrix.js";

export function assertCurrentStackProven(): void {
  const stack = loadTechnologyStackContract();
  const matrix = loadStackProofMatrix();

  const backend = matrix.backend.find(
    (item) => item.framework === stack.backend.framework
  );

  const frontend = matrix.frontend.find(
    (item) => item.framework === stack.frontend.framework
  );

  const database = matrix.database.find(
    (item) => item.engine === stack.database.engine
  );

  const failures = [
    backend?.proven ? null : `backend-not-proven:${stack.backend.framework}`,
    frontend?.proven ? null : `frontend-not-proven:${stack.frontend.framework}`,
    database?.proven ? null : `database-not-proven:${stack.database.engine}`
  ].filter(Boolean);

  if (failures.length > 0) {
    throw new Error(
      `Current stack is not enterprise-proven yet: ${failures.join(", ")}`
    );
  }
}
