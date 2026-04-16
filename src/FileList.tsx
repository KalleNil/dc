import { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { join } from "path";
import { spawn } from "child_process";
import type { FileEntry } from "./types.js";
import { getFiles } from "./fs-utils.js";

function openFile(filePath: string): void {
  const cmd = process.platform === "win32" ? "cmd" : "open";
  const args = process.platform === "win32" ? ["/c", "start", "", filePath] : [filePath];
  spawn(cmd, args, { detached: true, stdio: "ignore", shell: true }).unref();
}

export interface SelectedFile {
  path: string;
  isDirectory: boolean;
}

interface FileListProps {
  dirPath: string;
  focused: boolean;
  height: number;
  width: number;
  filter: string;
  onNavigate: (path: string) => void;
  onSelectionChange: (selected: SelectedFile | null) => void;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  if (maxLen <= 3) return str.slice(0, maxLen);
  return str.slice(0, maxLen - 3) + "...";
}

export default function FileList({ dirPath, focused, height, width, filter, onNavigate, onSelectionChange }: FileListProps) {
  const [allFiles, setAllFiles] = useState<FileEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const files = filter
    ? allFiles.filter((f) => f.name.toLowerCase().includes(filter.toLowerCase()))
    : allFiles;

  useEffect(() => {
    const entries = getFiles(dirPath);
    setAllFiles(entries);
    setSelectedIndex(0);
  }, [dirPath]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  useEffect(() => {
    const selected = files[selectedIndex];
    if (selected) {
      onSelectionChange({
        path: join(dirPath, selected.name),
        isDirectory: selected.isDirectory,
      });
    } else {
      onSelectionChange(null);
    }
  }, [selectedIndex, files, dirPath, onSelectionChange]);

  useInput(
    (input, key) => {
      if (!focused) return;

      const pageSize = Math.max(1, height - 2);

      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(files.length - 1, i + 1));
      } else if (key.pageUp) {
        setSelectedIndex((i) => Math.max(0, i - pageSize));
      } else if (key.pageDown) {
        setSelectedIndex((i) => Math.min(files.length - 1, i + pageSize));
      } else if (key.return) {
        const selected = files[selectedIndex];
        if (selected) {
          const fullPath = join(dirPath, selected.name);
          if (selected.isDirectory) {
            onNavigate(fullPath);
          } else {
            openFile(fullPath);
          }
        }
      } else if (input && input.length === 1 && /[a-z0-9]/i.test(input) && !key.ctrl && !key.meta) {
        const char = input.toLowerCase();
        // Search from current position + 1, wrapping around
        for (let i = 1; i <= files.length; i++) {
          const idx = (selectedIndex + i) % files.length;
          if (files[idx].name.toLowerCase().startsWith(char)) {
            setSelectedIndex(idx);
            break;
          }
        }
      }
    },
    { isActive: focused }
  );

  // Calculate scroll offset
  const scrollPadding = 2;
  let scrollOffset = 0;
  if (selectedIndex >= height - scrollPadding) {
    scrollOffset = Math.min(
      selectedIndex - height + scrollPadding + 1,
      files.length - height
    );
  }
  scrollOffset = Math.max(0, scrollOffset);

  const visibleFiles = files.slice(scrollOffset, scrollOffset + height);

  if (files.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>(empty)</Text>
      </Box>
    );
  }

  const iconWidth = 3;
  const availableWidth = width - iconWidth - 2;

  return (
    <Box flexDirection="column">
      {visibleFiles.map((file, idx) => {
        const actualIndex = scrollOffset + idx;
        const isSelected = actualIndex === selectedIndex;
        const displayName = truncate(file.name, availableWidth);

        return (
          <Text
            key={file.name}
            backgroundColor={isSelected && focused ? "blue" : undefined}
            color={file.isDirectory ? "cyan" : undefined}
          >
            {file.isDirectory ? "📁 " : "📄 "}
            {displayName}
          </Text>
        );
      })}
    </Box>
  );
}
