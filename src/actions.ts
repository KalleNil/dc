import { readFileSync, existsSync } from "fs";
import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { Action } from "./types.js";

function getConfigPaths(): string[] {
  const paths: string[] = [];
  
  // Next to the executable (for packaged exe)
  if (process.execPath) {
    paths.push(join(dirname(process.execPath), "actions.json"));
  }
  
  // In user's home directory
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) {
    paths.push(join(home, ".dc", "actions.json"));
  }
  
  // Development: relative to source
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    paths.push(join(__dirname, "..", "actions.json"));
  } catch {}
  
  return paths;
}

export function loadActions(): Action[] {
  for (const configPath of getConfigPaths()) {
    try {
      if (existsSync(configPath)) {
        const content = readFileSync(configPath, "utf-8");
        return JSON.parse(content);
      }
    } catch {}
  }
  return [];
}

export function executeAction(action: Action, path: string): void {
  const args = action.args.map((arg) => arg.replace("{path}", path));

  spawn(action.command, args, {
    detached: true,
    stdio: "ignore",
    shell: true,
  }).unref();
}
