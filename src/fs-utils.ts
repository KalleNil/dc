import { readdirSync, statSync } from "fs";
import { join, dirname, parse } from "path";
import type { TreeNode, FileEntry } from "./types.js";

export function getDirectories(dirPath: string): string[] {
  try {
    return readdirSync(dirPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  } catch {
    return [];
  }
}

export function getFiles(dirPath: string): FileEntry[] {
  try {
    return readdirSync(dirPath, { withFileTypes: true })
      .map((dirent) => ({
        name: dirent.name,
        isDirectory: dirent.isDirectory(),
      }))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
  } catch {
    return [];
  }
}

function loadChildDirs(dirPath: string): TreeNode[] {
  return getDirectories(dirPath).map((name) => ({
    path: join(dirPath, name),
    name,
    expanded: false,
    children: null,
  }));
}

export function createTreeNode(
  dirPath: string,
  expanded: boolean = false,
  withChildren: boolean = false
): TreeNode {
  const parsed = parse(dirPath);
  const name = parsed.base || dirPath;

  return {
    path: dirPath,
    name,
    expanded,
    children: withChildren ? loadChildDirs(dirPath) : null,
  };
}

export function buildInitialTree(currentPath: string): TreeNode {
  const parts: string[] = [];
  let p = currentPath;

  while (true) {
    parts.unshift(p);
    const parent = dirname(p);
    if (parent === p) break;
    p = parent;
  }

  const root = createTreeNode(parts[0], true, true);

  let current = root;
  for (let i = 1; i < parts.length; i++) {
    const targetPath = parts[i];
    if (!current.children) {
      current.children = getDirectories(current.path).map((name) => ({
        path: join(current.path, name),
        name,
        expanded: false,
        children: null,
      }));
    }

    const child = current.children.find((c) => c.path === targetPath);
    if (child) {
      child.expanded = true;
      child.children = getDirectories(child.path).map((name) => ({
        path: join(child.path, name),
        name,
        expanded: false,
        children: null,
      }));
      current = child;
    } else {
      break;
    }
  }

  return root;
}

export function expandTreeToPath(root: TreeNode, targetPath: string): TreeNode {
  const parts: string[] = [];
  let p = targetPath;

  while (true) {
    parts.unshift(p);
    const parent = dirname(p);
    if (parent === p) break;
    p = parent;
  }

  function expandNode(node: TreeNode, pathIndex: number): TreeNode {
    if (pathIndex >= parts.length) {
      return node;
    }

    const targetPart = parts[pathIndex];

    if (node.path === targetPart) {
      let children = node.children;
      if (children === null) {
        children = loadChildDirs(node.path);
      }

      if (pathIndex === parts.length - 1) {
        return { ...node, expanded: true, children };
      }

      const nextTarget = parts[pathIndex + 1];
      const updatedChildren = children.map((child) => {
        if (child.path === nextTarget) {
          return expandNode(child, pathIndex + 1);
        }
        return child;
      });

      return { ...node, expanded: true, children: updatedChildren };
    }

    if (node.children) {
      return {
        ...node,
        children: node.children.map((child) => expandNode(child, pathIndex)),
      };
    }

    return node;
  }

  return expandNode(root, 0);
}

export function getRoots(): string[] {
  if (process.platform === "win32") {
    const drives: string[] = [];
    for (let i = 65; i <= 90; i++) {
      const drive = String.fromCharCode(i) + ":\\";
      try {
        statSync(drive);
        drives.push(drive);
      } catch {
        // Drive doesn't exist
      }
    }
    return drives;
  }
  return ["/"];
}
