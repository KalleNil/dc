import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, basename } from "path";
import type { Bookmark } from "./types.js";

function getDcDir(): string {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  return join(home, ".dc");
}

function getBookmarksPath(): string {
  return join(getDcDir(), "bookmarks.json");
}

export function loadBookmarks(): Bookmark[] {
  try {
    const bookmarksPath = getBookmarksPath();
    if (!existsSync(bookmarksPath)) return [];
    const content = readFileSync(bookmarksPath, "utf-8");
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b) =>
        b !== null &&
        typeof b === "object" &&
        typeof b.path === "string" &&
        typeof b.label === "string" &&
        typeof b.createdAt === "string"
    );
  } catch {
    return [];
  }
}

export function saveBookmarks(bookmarks: Bookmark[]): void {
  try {
    const dcDir = getDcDir();
    if (!existsSync(dcDir)) {
      mkdirSync(dcDir, { recursive: true });
    }
    writeFileSync(getBookmarksPath(), JSON.stringify(bookmarks, null, 2), "utf-8");
  } catch {
    // Silently ignore save errors (e.g. read-only filesystem)
  }
}

export function addBookmark(
  bookmarks: Bookmark[],
  path: string,
  label?: string
): Bookmark[] {
  const resolvedLabel = label?.trim() || basename(path) || path;
  const newBookmark: Bookmark = {
    path,
    label: resolvedLabel,
    createdAt: new Date().toISOString(),
  };
  const existingIndex = bookmarks.findIndex((b) => b.path === path);
  if (existingIndex !== -1) {
    const updated = [...bookmarks];
    updated[existingIndex] = newBookmark;
    return updated;
  }
  return [...bookmarks, newBookmark];
}

export function removeBookmark(bookmarks: Bookmark[], path: string): Bookmark[] {
  return bookmarks.filter((b) => b.path !== path);
}

export function isBookmarked(bookmarks: Bookmark[], path: string): boolean {
  return bookmarks.some((b) => b.path === path);
}
