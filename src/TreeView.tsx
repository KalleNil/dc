import { useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { join } from "path";
import type { TreeNode } from "./types.js";
import { getDirectories } from "./fs-utils.js";

interface FlatNode {
  node: TreeNode;
  depth: number;
  parent: TreeNode | null;
}

function flattenTree(
  node: TreeNode,
  depth: number = 0,
  parent: TreeNode | null = null
): FlatNode[] {
  const result: FlatNode[] = [{ node, depth, parent }];
  if (node.expanded && node.children) {
    for (const child of node.children) {
      result.push(...flattenTree(child, depth + 1, node));
    }
  }
  return result;
}

function findNodeByPath(node: TreeNode, path: string): TreeNode | null {
  if (node.path === path) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByPath(child, path);
      if (found) return found;
    }
  }
  return null;
}

function updateNodeInTree(
  root: TreeNode,
  path: string,
  updater: (node: TreeNode) => TreeNode
): TreeNode {
  if (root.path === path) {
    return updater(root);
  }
  if (root.children) {
    return {
      ...root,
      children: root.children.map((child) =>
        updateNodeInTree(child, path, updater)
      ),
    };
  }
  return root;
}

interface TreeViewProps {
  root: TreeNode;
  selectedPath: string;
  focused: boolean;
  height: number;
  width: number;
  filter: string;
  onSelect: (path: string) => void;
  onTreeChange: (root: TreeNode) => void;
  onConfirm: () => void;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  if (maxLen <= 3) return str.slice(0, maxLen);
  return str.slice(0, maxLen - 3) + "...";
}

export default function TreeView({
  root,
  selectedPath,
  focused,
  height,
  width,
  filter,
  onSelect,
  onTreeChange,
  onConfirm,
}: TreeViewProps) {
  const allFlatNodes = flattenTree(root);
  const flatNodes = filter
    ? allFlatNodes.filter((f) => f.node.name.toLowerCase().includes(filter.toLowerCase()))
    : allFlatNodes;
  let selectedIndex = flatNodes.findIndex((f) => f.node.path === selectedPath);

  // Auto-select first filtered item if current selection isn't in filtered results
  useEffect(() => {
    if (filter && flatNodes.length > 0 && selectedIndex === -1) {
      onSelect(flatNodes[0].node.path);
    }
  }, [filter, flatNodes, selectedIndex, onSelect]);

  // Use effective index for navigation
  const effectiveIndex = selectedIndex === -1 ? 0 : selectedIndex;

  useInput(
    (input, key) => {
      if (!focused) return;
      if (flatNodes.length === 0) return;

      const currentFlat = flatNodes[effectiveIndex];
      if (!currentFlat) return;
      const current = currentFlat.node;

      const pageSize = Math.max(1, height - 2);

      if (key.upArrow) {
        if (effectiveIndex > 0) {
          onSelect(flatNodes[effectiveIndex - 1].node.path);
        }
      } else if (key.downArrow) {
        if (effectiveIndex < flatNodes.length - 1) {
          onSelect(flatNodes[effectiveIndex + 1].node.path);
        }
      } else if (key.pageUp) {
        const newIndex = Math.max(0, effectiveIndex - pageSize);
        onSelect(flatNodes[newIndex].node.path);
      } else if (key.pageDown) {
        const newIndex = Math.min(flatNodes.length - 1, effectiveIndex + pageSize);
        onSelect(flatNodes[newIndex].node.path);
      } else if (key.leftArrow) {
        if (current.expanded) {
          // Collapse current node
          const newRoot = updateNodeInTree(root, current.path, (n) => ({
            ...n,
            expanded: false,
          }));
          onTreeChange(newRoot);
        } else if (currentFlat.parent) {
          // Select parent
          onSelect(currentFlat.parent.path);
        }
      } else if (key.rightArrow) {
        if (!current.expanded) {
          // Expand current node
          let children = current.children;
          if (children === null) {
            children = getDirectories(current.path).map((name) => ({
              path: join(current.path, name),
              name,
              expanded: false,
              children: null,
            }));
          }
          const newRoot = updateNodeInTree(root, current.path, (n) => ({
            ...n,
            expanded: true,
            children,
          }));
          onTreeChange(newRoot);
        } else if (current.children && current.children.length > 0) {
          // Select first child
          onSelect(current.children[0].path);
        }
      } else if (key.return) {
        onConfirm();
      } else if (input && input.length === 1 && /[a-z0-9]/i.test(input) && !key.ctrl && !key.meta) {
        const char = input.toLowerCase();
        // Search from current position + 1, wrapping around
        for (let i = 1; i <= flatNodes.length; i++) {
          const idx = (effectiveIndex + i) % flatNodes.length;
          if (flatNodes[idx].node.name.toLowerCase().startsWith(char)) {
            onSelect(flatNodes[idx].node.path);
            break;
          }
        }
      }
    },
    { isActive: focused }
  );

  // Calculate scroll offset to keep selected item visible
  const scrollPadding = 2;
  let scrollOffset = 0;
  if (effectiveIndex >= height - scrollPadding) {
    scrollOffset = Math.min(
      effectiveIndex - height + scrollPadding + 1,
      flatNodes.length - height
    );
  }
  scrollOffset = Math.max(0, scrollOffset);

  const visibleNodes = flatNodes.slice(scrollOffset, scrollOffset + height);

  return (
    <Box flexDirection="column">
      {visibleNodes.map((flat) => {
        const isSelected = flat.node.path === selectedPath;
        const prefix = flat.node.children?.length || flat.node.children === null
          ? flat.node.expanded
            ? "▼ "
            : "▶ "
          : "  ";
        const indent = "  ".repeat(flat.depth);
        const usedWidth = indent.length + prefix.length;
        const availableWidth = width - usedWidth - 2;
        const displayName = truncate(flat.node.name, availableWidth);

        return (
          <Text
            key={flat.node.path}
            backgroundColor={isSelected && focused ? "blue" : undefined}
            color={isSelected && !focused ? "blue" : undefined}
          >
            {indent}
            {prefix}
            {displayName}
          </Text>
        );
      })}
    </Box>
  );
}
