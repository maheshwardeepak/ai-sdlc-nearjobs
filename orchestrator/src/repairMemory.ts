import fs from "fs";
import path from "path";

const MEMORY_FILE = path.resolve(
  process.cwd(),
  "runtime/repair-memory.json"
);

export type RepairMemoryEntry = {
  category: string;
  repair: string;
  success: boolean;
  timestamp: string;
};

export function loadRepairMemory(): RepairMemoryEntry[] {
  if (!fs.existsSync(MEMORY_FILE)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
}

export function saveRepairMemory(entry: RepairMemoryEntry) {
  const memory = loadRepairMemory();

  memory.push(entry);

  fs.mkdirSync(path.dirname(MEMORY_FILE), {
    recursive: true
  });

  fs.writeFileSync(
    MEMORY_FILE,
    JSON.stringify(memory, null, 2)
  );
}


export function findSuccessfulRepair(category: string) {
  const memory = loadRepairMemory();

  return memory.find(
    (m) => m.category === category && m.success
  );
}
