import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRepoPath } from "@/lib/git";
import { existsSync } from "fs";
import { spawnSync } from "child_process";
import TagsClient from "./TagsClient";

type Params = { params: Promise<{ username: string; repo: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, repo } = await params;
  return { title: `Tags · ${username}/${repo}` };
}

interface TagInfo {
  name: string;
  sha: string;
  author: string;
  date: string;
  message: string;
}

function runGitSync(args: string[], cwd: string): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (result.status !== 0) return "";
  return (result.stdout ?? "").trim();
}

function getTagsSync(repoPath: string): TagInfo[] {
  const tagList = runGitSync(["tag", "--sort=-version:refname"], repoPath);
  if (!tagList) return [];
  return tagList
    .split("\n")
    .filter(Boolean)
    .map((name) => {
      const info = runGitSync(["log", "-1", "--format=%H|%an|%ai|%s", name], repoPath);
      if (!info) return { name, sha: "", author: "", date: "", message: "" };
      const [sha, author, date, ...msgParts] = info.split("|");
      return {
        name,
        sha: sha ?? "",
        author: author ?? "",
        date: date ?? "",
        message: msgParts.join("|"),
      };
    });
}

export default async function TagsPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName } = await params;

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();
  if (repo.isPrivate && session.username !== username) notFound();

  const isOwner = session.username === username;
  const repoPath = getRepoPath(username, repoName);
  const tags = existsSync(repoPath) ? getTagsSync(repoPath) : [];

  return (
    <TagsClient
      username={username}
      repoName={repoName}
      defaultBranch={repo.defaultBranch}
      isOwner={isOwner}
      initialTags={tags}
    />
  );
}
