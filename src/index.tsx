import { render } from "ink";
import { writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import App from "./App.js";

const initialPath = process.cwd();
const shellPid = process.argv[2] || process.ppid;
const resultFile = join(tmpdir(), `dc-${shellPid}.txt`);

let cleared = false;
let clearFn: () => void;

const cleanup = () => {
  if (!cleared && clearFn) {
    cleared = true;
    clearFn();
  }
};

const { waitUntilExit, clear, unmount } = render(
  <App
    initialPath={initialPath}
    onExit={(path) => {
      if (path) {
        writeFileSync(resultFile, path, { flag: "w" });
      }
      cleanup();
    }}
  />,
  { exitOnCtrlC: false }
);

clearFn = clear;

process.on("SIGINT", () => {
  cleanup();
  unmount();
  process.exit(0);
});

process.on("exit", cleanup);

waitUntilExit().then(cleanup);
