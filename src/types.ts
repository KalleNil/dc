export interface TreeNode {
  path: string;
  name: string;
  expanded: boolean;
  children: TreeNode[] | null;
}

export interface FileEntry {
  name: string;
  isDirectory: boolean;
}

export interface Action {
  key: string;
  label: string;
  command: string;
  args: string[];
  target: "directory" | "file" | "both";
}
