import pino from "pino";
import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve(process.cwd(), "runtime/logs");

fs.mkdirSync(LOG_DIR, { recursive: true });

export const logger = pino({
  level: "info",
  transport: {
    targets: [
      {
        target: "pino/file",
        options: {
          destination: path.join(LOG_DIR, "factory.log")
        }
      },
      {
        target: "pino-pretty",
        options: {
          colorize: true
        }
      }
    ]
  }
});
