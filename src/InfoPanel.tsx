import { Box, Text } from "ink";
import { statSync } from "fs";
import { basename, extname } from "path";

interface InfoPanelProps {
  path: string;
  height: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(date: Date): string {
  return date.toLocaleString();
}

export default function InfoPanel({ path, height }: InfoPanelProps) {
  let stats;
  try {
    stats = statSync(path);
  } catch {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>Unable to read info</Text>
      </Box>
    );
  }

  const isDir = stats.isDirectory();
  const name = basename(path);
  const ext = extname(path).toLowerCase();

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">{isDir ? "📁 Folder" : "📄 File"}</Text>
      <Text> </Text>
      
      <Text dimColor>Name:</Text>
      <Text>{name}</Text>
      <Text> </Text>

      {!isDir && (
        <>
          <Text dimColor>Size:</Text>
          <Text>{formatSize(stats.size)}</Text>
          <Text> </Text>
        </>
      )}

      {!isDir && ext && (
        <>
          <Text dimColor>Type:</Text>
          <Text>{ext.slice(1).toUpperCase()}</Text>
          <Text> </Text>
        </>
      )}

      <Text dimColor>Modified:</Text>
      <Text>{formatDate(stats.mtime)}</Text>
      <Text> </Text>

      <Text dimColor>Created:</Text>
      <Text>{formatDate(stats.birthtime)}</Text>
      <Text> </Text>

      <Text dimColor>Accessed:</Text>
      <Text>{formatDate(stats.atime)}</Text>
      <Text> </Text>

      {!isDir && (
        <>
          <Text dimColor>Readonly:</Text>
          <Text>{(stats.mode & 0o200) === 0 ? "Yes" : "No"}</Text>
        </>
      )}
    </Box>
  );
}
