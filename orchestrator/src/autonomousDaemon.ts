import fs from "fs";
import path from "path";
import { runSmartFleetDelivery } from "./smartFleetDelivery.js";

const POLL_INTERVAL_MS = 30000;

const LOCK_FILE = path.resolve(
  process.cwd(),
  "runtime",
  "smart-daemon.lock"
);

let running = false;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    throw new Error("Smart daemon already running.");
  }

  fs.writeFileSync(LOCK_FILE, String(process.pid));
}

function releaseLock() {
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
  }
}

export async function runDaemonOnce() {
  console.log("Autonomous daemon scan completed.");

  const result = await runSmartFleetDelivery();

  return {
    success: result.success,
    mode: "smart-once",
    result
  };
}

export async function startSmartDaemon() {
  acquireLock();

  process.on("SIGINT", () => {
    console.log("Stopping smart daemon...");
    releaseLock();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("Stopping smart daemon...");
    releaseLock();
    process.exit(0);
  });

  console.log("Starting smart autonomous daemon...");
  console.log(`Poll interval: ${POLL_INTERVAL_MS}ms`);

  while (true) {
    if (running) {
      console.log("Previous delivery still running. Skipping cycle.");
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    running = true;

    try {
      const result = await runDaemonOnce();
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Daemon cycle failed:", error);
    } finally {
      running = false;
    }

    await sleep(POLL_INTERVAL_MS);
  }
}
