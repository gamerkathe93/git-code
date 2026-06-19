import simpleGit, { SimpleGit, DefaultLogFields, ListLogLine } from "simple-git";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

const REPO_BASE = process.env.REPO_STORAGE_PATH ?? path.join(process.env.HOME ?? "~", ".gitcode", "repos");

export function getRepoPath(username: string, repoName: string): string {
  return path.join(REPO_BASE, username, `${repoName}.git`);
}

export function getWorkDir(username: string, repoName: string): string {
  return path.join(REPO_BASE, username, repoName);
}

export async function initBareRepo(username: string, repoName: string): Promise<string> {
  const repoPath = getRepoPath(username, repoName);
  await fs.mkdir(repoPath, { recursive: true });
  const git = simpleGit();
  await git.raw(["init", "--bare", repoPath]);
  return repoPath;
}

export async function repoExists(username: string, repoName: string): Promise<boolean> {
  return existsSync(getRepoPath(username, repoName));
}

export async function initWithReadme(
  username: string,
  repoName: string,
  description: string,
  defaultBranch = "main",
  initReadme = false,
  license?: string
): Promise<void> {
  const barePath = getRepoPath(username, repoName);
  const workPath = getWorkDir(username, repoName) + "-work-tmp";

  if (!existsSync(barePath)) {
    await initBareRepo(username, repoName);
  }

  if (!initReadme && !license) return;

  try {
    await fs.mkdir(path.dirname(workPath), { recursive: true });
    const git = simpleGit();
    await git.clone(barePath, workPath);
    const wgit = simpleGit(workPath);
    await wgit.addConfig("user.name", username);
    await wgit.addConfig("user.email", `${username}@gitcode.local`);

    if (initReadme) {
      const readmeContent = `# ${repoName}\n\n${description || "A new repository."}\n`;
      await fs.writeFile(path.join(workPath, "README.md"), readmeContent);
    }

    if (license === "MIT") {
      const year = new Date().getFullYear();
      const mitContent = `MIT License\n\nCopyright (c) ${year} ${username}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n`;
      await fs.writeFile(path.join(workPath, "LICENSE"), mitContent);
    }

    const statusResult = await wgit.status();
    if (statusResult.files.length > 0) {
      await wgit.add(".");
      await wgit.commit("Initial commit");
      await wgit.raw(["push", "--set-upstream", "origin", defaultBranch]);
    }
  } catch (e) {
    console.error("initWithReadme error:", e);
  } finally {
    await fs.rm(workPath, { recursive: true, force: true }).catch(() => {});
  }
}

export async function getCommits(
  username: string,
  repoName: string,
  branch = "HEAD",
  limit = 30
) {
  const repoPath = getRepoPath(username, repoName);
  if (!existsSync(repoPath)) return [];
  try {
    const git: SimpleGit = simpleGit(repoPath);
    const log = await git.log(["--max-count", String(limit), branch]);
    return (log.all as (DefaultLogFields & ListLogLine)[]).map((c) => ({
      sha: c.hash,
      shortSha: c.hash.slice(0, 7),
      message: c.message,
      author: { name: c.author_name, email: c.author_email },
      date: c.date,
    }));
  } catch {
    return [];
  }
}

export async function getBranches(username: string, repoName: string) {
  const repoPath = getRepoPath(username, repoName);
  if (!existsSync(repoPath)) return [];
  try {
    const git: SimpleGit = simpleGit(repoPath);
    const result = await git.branch(["-a"]);
    return Object.keys(result.branches)
      .filter((b) => !b.startsWith("remotes/") && b !== "HEAD")
      .map((b) => result.branches[b]);
  } catch {
    return [];
  }
}

export async function getDefaultBranch(username: string, repoName: string): Promise<string> {
  const repoPath = getRepoPath(username, repoName);
  if (!existsSync(repoPath)) return "main";
  try {
    const git: SimpleGit = simpleGit(repoPath);
    const raw = await git.raw(["symbolic-ref", "--short", "HEAD"]).catch(() => "main");
    return raw.trim() || "main";
  } catch {
    return "main";
  }
}

export interface TreeEntry {
  name: string;
  type: "blob" | "tree";
  path: string;
  size?: number;
  sha?: string;
}

export async function getTree(
  username: string,
  repoName: string,
  ref = "HEAD",
  subPath = ""
): Promise<TreeEntry[]> {
  const repoPath = getRepoPath(username, repoName);
  if (!existsSync(repoPath)) return [];
  try {
    const git: SimpleGit = simpleGit(repoPath);
    const treeRef = subPath ? `${ref}:${subPath}` : ref;
    const raw = await git.raw(["ls-tree", treeRef]);
    if (!raw.trim()) return [];
    return raw
      .trim()
      .split("\n")
      .map((line) => {
        const [, type, , ...nameParts] = line.split(/\s+/);
        const name = nameParts.join(" ");
        return {
          name,
          type: (type === "tree" ? "tree" : "blob") as "blob" | "tree",
          path: subPath ? `${subPath}/${name}` : name,
        };
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  } catch {
    return [];
  }
}

export async function getFileContent(
  username: string,
  repoName: string,
  filePath: string,
  ref = "HEAD"
): Promise<string | null> {
  const repoPath = getRepoPath(username, repoName);
  if (!existsSync(repoPath)) return null;
  try {
    // Sanitize inputs to prevent path traversal and shell injection
    const safeFilePath = filePath.replace(/\.\.\/|\.\.$/g, "");
    const safeRef = /^[a-zA-Z0-9.\/\-_]+$/.test(ref) ? ref : "HEAD";
    const git: SimpleGit = simpleGit(repoPath);
    const content = await git.raw(["show", `${safeRef}:${safeFilePath}`]);
    return content;
  } catch {
    return null;
  }
}

export async function hasAnyCommit(username: string, repoName: string): Promise<boolean> {
  const repoPath = getRepoPath(username, repoName);
  if (!existsSync(repoPath)) return false;
  try {
    const git: SimpleGit = simpleGit(repoPath);
    await git.raw(["rev-parse", "HEAD"]);
    return true;
  } catch {
    return false;
  }
}

export function getCloneUrls(username: string, repoName: string, baseUrl = "http://localhost:3000") {
  return {
    http: `${baseUrl}/git/${username}/${repoName}.git`,
    ssh: `git@${new URL(baseUrl).hostname}:${username}/${repoName}.git`,
  };
}
