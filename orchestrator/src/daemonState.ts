import fs from "fs";
import path from "path";

const STATE_FILE = path.resolve(
  process.cwd(),
  "runtime",
  "smart-daemon-state.json"
);

export function saveDaemonState(state: unknown) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });

  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        state
      },
      null,
      2
    )
  );
}

export function loadDaemonState() {
  if (!fs.existsSync(STATE_FILE)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}
