import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { existsSync } from "fs";
import type { Bookmark } from "./types.js";

interface BookmarksPanelProps {
  bookmarks: Bookmark[];
  focused: boolean;
  height: number;
  width: number;
  onNavigate: (path: string) => void;
  onRemove: (path: string) => void;
  onClose: () => void;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  if (maxLen <= 3) return str.slice(0, maxLen);
  return str.slice(0, maxLen - 3) + "...";
}

export default function BookmarksPanel({
  bookmarks,
  focused,
  height,
  width,
  onNavigate,
  onRemove,
  onClose,
}: BookmarksPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput(
    (input, key) => {
      if (!focused) return;

      if (key.escape) {
        onClose();
      } else if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(bookmarks.length - 1, i + 1));
      } else if (key.return) {
        const bookmark = bookmarks[selectedIndex];
        if (bookmark) {
          onNavigate(bookmark.path);
          onClose();
        }
      } else if (input === "d" || key.delete) {
        const bookmark = bookmarks[selectedIndex];
        if (bookmark) {
          onRemove(bookmark.path);
          setSelectedIndex((i) => Math.min(i, Math.max(0, bookmarks.length - 2)));
        }
      }
    },
    { isActive: focused }
  );

  const listHeight = Math.max(1, height - 2);

  // Calculate scroll offset
  const scrollPadding = 2;
  let scrollOffset = 0;
  if (selectedIndex >= listHeight - scrollPadding) {
    scrollOffset = Math.min(
      selectedIndex - listHeight + scrollPadding + 1,
      bookmarks.length - listHeight
    );
  }
  scrollOffset = Math.max(0, scrollOffset);

  const visibleBookmarks = bookmarks.slice(scrollOffset, scrollOffset + listHeight);

  const labelColWidth = Math.max(10, Math.floor((width - 6) * 0.35));
  const pathColWidth = Math.max(10, width - labelColWidth - 6);

  if (bookmarks.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="cyan">★ Bookmarks</Text>
        <Text> </Text>
        <Text dimColor>No bookmarks saved yet.</Text>
        <Text dimColor>Press Ctrl+B on a directory to bookmark it.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">★ Bookmarks</Text>
      <Text> </Text>
      {visibleBookmarks.map((bookmark, idx) => {
        const actualIndex = scrollOffset + idx;
        const isSelected = actualIndex === selectedIndex;
        const exists = existsSync(bookmark.path);

        return (
          <Box key={bookmark.path} flexDirection="row">
            <Text
              backgroundColor={isSelected && focused ? "blue" : undefined}
            >
              {isSelected ? "▶ " : "  "}
              <Text color={exists ? undefined : "red"}>
                {truncate(bookmark.label, labelColWidth)}
              </Text>
              {"  "}
              <Text color={exists ? "gray" : "red"}>
                {truncate(bookmark.path, pathColWidth)}
              </Text>
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
