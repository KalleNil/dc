import { useState, useMemo, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import type { TreeNode, Action } from "./types.js";
import { buildInitialTree, expandTreeToPath } from "./fs-utils.js";
import { loadActions, executeAction } from "./actions.js";
import TreeView from "./TreeView.js";
import FileList, { SelectedFile } from "./FileList.js";
import InfoPanel from "./InfoPanel.js";

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
  
  const currentFilter = filterPanel === "tree" ? treeFilter : filesFilter;
  const setCurrentFilter = filterPanel === "tree" ? setTreeFilter : setFilesFilter;

  const height = (stdout?.rows ?? 24) - 6;
  const totalWidth = stdout?.columns ?? 80;
  const treeWidth = 40;
  const infoPanelWidth = 30;
  const fileListWidth = totalWidth - treeWidth - (showInfoPanel ? infoPanelWidth : 0);

  const isDirectory = activePanel === "tree" || selectedFile?.isDirectory !== false;
  const targetType = isDirectory ? "directory" : "file";
  const actionPath = activePanel === "tree" ? selectedPath : (selectedFile?.path ?? selectedPath);

  const visibleActions = useMemo(() => {
    return allActions.filter((a) => a.target === "both" || a.target === targetType);
  }, [allActions, targetType]);

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
            focused={activePanel === "tree" && !isFiltering}
            height={height - 2}
            width={treeWidth}
            filter={treeFilter}
            onSelect={setSelectedPath}
            onTreeChange={setRoot}
            onConfirm={handleConfirm}
          />
        </Box>

        <Box flexDirection="column" flexGrow={1} borderStyle="single" borderRight={showInfoPanel ? false : undefined}>
          <FileList
            dirPath={selectedPath}
            focused={activePanel === "files" && !isFiltering}
            height={height - 2}
            width={fileListWidth}
            filter={filesFilter}
            onNavigate={handleNavigate}
            onSelectionChange={handleFileSelectionChange}
          />
        </Box>

        {showInfoPanel && (
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
        ) : (
          <Text dimColor>Tab: switch  Enter: select  Ctrl+F: filter  Ctrl+P: info  Esc: {treeFilter || filesFilter ? "clear filter" : "cancel"}</Text>
        )}
      </Box>
    </Box>
  );
}
