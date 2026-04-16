import { useState, useMemo, useCallback, useEffect } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { basename } from "path";
import type { TreeNode, Action, Bookmark } from "./types.js";
import { buildInitialTree, expandTreeToPath } from "./fs-utils.js";
import { loadActions, executeAction } from "./actions.js";
import {
  loadBookmarks,
  saveBookmarks,
  addBookmark,
  removeBookmark,
  isBookmarked,
} from "./bookmarks.js";
import TreeView from "./TreeView.js";
import FileList, { SelectedFile } from "./FileList.js";
import InfoPanel from "./InfoPanel.js";
import BookmarksPanel from "./BookmarksPanel.js";

interface AppProps {
  initialPath: string;
  onExit: (selectedPath: string | null) => void;
}

export default function App({ initialPath, onExit }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const allActions = useMemo(() => loadActions(), []);
  const [root, setRoot] = useState<TreeNode>(() => buildInitialTree(initialPath));
  const [selectedPath, setSelectedPath] = useState(initialPath);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [activePanel, setActivePanel] = useState<"tree" | "files">("tree");
  const [isFiltering, setIsFiltering] = useState(false);
  const [filterPanel, setFilterPanel] = useState<"tree" | "files">("tree");
  const [treeFilter, setTreeFilter] = useState("");
  const [filesFilter, setFilesFilter] = useState("");
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  // Bookmark state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => loadBookmarks());
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [bookmarkMessage, setBookmarkMessage] = useState("");

  // Auto-clear bookmark status message after 2 seconds
  useEffect(() => {
    if (!bookmarkMessage) return;
    const timer = setTimeout(() => setBookmarkMessage(""), 2000);
    return () => clearTimeout(timer);
  }, [bookmarkMessage]);

  const currentFilter = filterPanel === "tree" ? treeFilter : filesFilter;
  const setCurrentFilter = filterPanel === "tree" ? setTreeFilter : setFilesFilter;

  const height = (stdout?.rows ?? 24) - 6;
  const totalWidth = stdout?.columns ?? 80;
  const treeWidth = 40;
  const infoPanelWidth = 30;
  const fileListWidth = totalWidth - treeWidth - (showInfoPanel && !showBookmarks ? infoPanelWidth : 0);

  const isDirectory = activePanel === "tree" || selectedFile?.isDirectory !== false;
  const targetType = isDirectory ? "directory" : "file";
  const actionPath = activePanel === "tree" ? selectedPath : (selectedFile?.path ?? selectedPath);

  const visibleActions = useMemo(() => {
    return allActions.filter((a) => a.target === "both" || a.target === targetType);
  }, [allActions, targetType]);

  const handleAddBookmark = useCallback((path: string, label: string) => {
    const newBookmarks = addBookmark(bookmarks, path, label);
    saveBookmarks(newBookmarks);
    setBookmarks(newBookmarks);
    const displayLabel = label || basename(path) || path;
    setBookmarkMessage("★ Bookmarked: " + displayLabel);
  }, [bookmarks]);

  const handleRemoveBookmark = useCallback((path: string) => {
    const newBookmarks = removeBookmark(bookmarks, path);
    saveBookmarks(newBookmarks);
    setBookmarks(newBookmarks);
  }, [bookmarks]);

  useInput((input, key) => {
    if (isFiltering) {
      if (key.escape) {
        // Clear filter and exit filter mode
        setCurrentFilter("");
        setIsFiltering(false);
      } else if (key.return || key.tab) {
        // Keep filter, exit filter mode, return to panel
        setIsFiltering(false);
      } else if (key.backspace || key.delete) {
        setCurrentFilter((t) => t.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setCurrentFilter((t) => t + input);
      }
      return;
    }

    if (isBookmarking) {
      if (key.escape) {
        setIsBookmarking(false);
        setBookmarkLabel("");
      } else if (key.return) {
        handleAddBookmark(selectedPath, bookmarkLabel);
        setIsBookmarking(false);
        setBookmarkLabel("");
      } else if (key.backspace || key.delete) {
        setBookmarkLabel((t) => t.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setBookmarkLabel((t) => t + input);
      }
      return;
    }

    if (showBookmarks) {
      if (key.ctrl && input.toLowerCase() === "j") {
        setShowBookmarks(false);
      }
      // Other keys are handled by BookmarksPanel via its own useInput
      return;
    }

    if (key.escape) {
      if (treeFilter || filesFilter) {
        setTreeFilter("");
        setFilesFilter("");
      } else {
        onExit(null);
        exit();
      }
    } else if (key.tab) {
      setActivePanel((p) => (p === "tree" ? "files" : "tree"));
    } else if (key.ctrl) {
      if (input.toLowerCase() === "c") {
        onExit(null);
        exit();
      } else if (input.toLowerCase() === "f") {
        setFilterPanel(activePanel);
        setIsFiltering(true);
      } else if (input.toLowerCase() === "p") {
        setShowInfoPanel((v) => !v);
      } else if (input.toLowerCase() === "b") {
        const defaultLabel = basename(selectedPath) || selectedPath;
        setBookmarkLabel(defaultLabel);
        setIsBookmarking(true);
      } else if (input.toLowerCase() === "j") {
        setShowBookmarks((v) => !v);
      } else {
        const action = visibleActions.find((a) => a.key.toLowerCase() === input.toLowerCase());
        if (action) {
          executeAction(action, actionPath);
        }
      }
    }
  });

  const handleConfirm = () => {
    onExit(selectedPath);
    exit();
  };

  const handleNavigate = useCallback((path: string) => {
    setRoot((currentRoot) => expandTreeToPath(currentRoot, path));
    setSelectedPath(path);
  }, []);

  const handleFileSelectionChange = useCallback((selected: SelectedFile | null) => {
    setSelectedFile(selected);
  }, []);

  const currentIsBookmarked = isBookmarked(bookmarks, selectedPath);

  return (
    <Box flexDirection="column" height={height + 5}>
      <Box borderStyle="single" borderBottom={false} paddingX={1}>
        <Text bold>DC</Text>
        <Text>  </Text>
        {visibleActions.map((action, i) => (
          <Text key={action.key}>
            {i > 0 && <Text>  </Text>}
            <Text color="cyan">Ctrl+{action.key.toUpperCase()}</Text>
            <Text dimColor> {action.label}</Text>
          </Text>
        ))}
        <Text>  </Text>
        <Text color="cyan">Ctrl+B</Text>
        <Text dimColor> Bookmark</Text>
        <Text>  </Text>
        <Text color="cyan">Ctrl+J</Text>
        <Text dimColor> Bookmarks</Text>
      </Box>

      <Box flexDirection="row" height={height}>
        <Box
          flexDirection="column"
          width={treeWidth}
          borderStyle="single"
          borderRight={false}
        >
          <TreeView
            root={root}
            selectedPath={selectedPath}
            focused={activePanel === "tree" && !isFiltering && !showBookmarks}
            height={height - 2}
            width={treeWidth}
            filter={treeFilter}
            onSelect={setSelectedPath}
            onTreeChange={setRoot}
            onConfirm={handleConfirm}
          />
        </Box>

        <Box
          flexDirection="column"
          flexGrow={1}
          borderStyle="single"
          borderRight={showInfoPanel && !showBookmarks ? false : undefined}
        >
          {showBookmarks ? (
            <BookmarksPanel
              bookmarks={bookmarks}
              focused={showBookmarks}
              height={height - 2}
              width={fileListWidth - 2}
              onNavigate={handleNavigate}
              onRemove={handleRemoveBookmark}
              onClose={() => setShowBookmarks(false)}
            />
          ) : (
            <FileList
              dirPath={selectedPath}
              focused={activePanel === "files" && !isFiltering}
              height={height - 2}
              width={fileListWidth}
              filter={filesFilter}
              onNavigate={handleNavigate}
              onSelectionChange={handleFileSelectionChange}
            />
          )}
        </Box>

        {showInfoPanel && !showBookmarks && (
          <Box flexDirection="column" width={30} borderStyle="single">
            <InfoPanel
              path={activePanel === "files" && selectedFile ? selectedFile.path : selectedPath}
              height={height - 2}
            />
          </Box>
        )}
      </Box>

      <Box paddingX={1}>
        <Text dimColor>Path: </Text>
        <Text>{selectedPath}</Text>
        {currentIsBookmarked && <Text color="yellow"> ★</Text>}
        {treeFilter && activePanel === "tree" && (
          <Text color="yellow"> [filter: {treeFilter}]</Text>
        )}
        {filesFilter && activePanel === "files" && (
          <Text color="yellow"> [filter: {filesFilter}]</Text>
        )}
      </Box>
      <Box paddingX={1}>
        {isFiltering ? (
          <>
            <Text color="cyan">Filter ({filterPanel}): </Text>
            <Text>{currentFilter}</Text>
            <Text color="gray">█</Text>
            <Text dimColor>  (Tab/Enter: done, Esc: clear)</Text>
          </>
        ) : isBookmarking ? (
          <>
            <Text color="cyan">Bookmark label: </Text>
            <Text>{bookmarkLabel}</Text>
            <Text color="gray">█</Text>
            <Text dimColor>  (Enter: save, Esc: cancel)</Text>
          </>
        ) : showBookmarks ? (
          <Text dimColor>↑/↓: navigate  Enter: jump  d/Del: remove  Esc/Ctrl+J: close</Text>
        ) : bookmarkMessage ? (
          <Text color="yellow">{bookmarkMessage}</Text>
        ) : (
          <Text dimColor>Tab: switch  Enter: select  Ctrl+F: filter  Ctrl+P: info  Ctrl+B: bookmark  Ctrl+J: bookmarks  Esc: {treeFilter || filesFilter ? "clear filter" : "cancel"}</Text>
        )}
      </Box>
    </Box>
  );
}
