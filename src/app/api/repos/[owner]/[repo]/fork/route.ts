import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRepoPath } from "@/lib/git";
import fs from "fs/promises";
import path from "path";

type Params = { params: Promise<{ owner: string; repo: string }> };

function spawnGitClone(sourcePath: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["clone", "--bare", sourcePath, destPath]);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git clone --bare exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { owner, repo: repoName } = await params;

  // Find source repo with owner
  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) {
    return NextResponse.json({ error: "Repository not found" }, { status: 404 });
  }

  const sourceRepo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
    include: { owner: { select: { username: true } } },
  });
  if (!sourceRepo) {
    return NextResponse.json({ error: "Repository not found" }, { status: 404 });
  }

  // Can't fork your own repo
  if (session.userId === ownerUser.id) {
    return NextResponse.json({ error: "Cannot fork your own repository" }, { status: 400 });
  }

  // Check if fork already exists
  const existingFork = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: session.userId, name: repoName } },
  });
  if (existingFork) {
    return NextResponse.json({ fork: existingFork, alreadyExists: true }, { status: 200 });
  }

  // Create the fork DB record
  const newRepo = await db.repository.create({
    data: {
      name: sourceRepo.name,
      description: sourceRepo.description,
      defaultBranch: sourceRepo.defaultBranch,
      language: sourceRepo.language,
      topics: sourceRepo.topics,
      ownerId: session.userId,
      isPrivate: false,
    },
  });

  // Git clone bare repo server-side
  const sourcePath = getRepoPath(owner, repoName);
  const destPath = getRepoPath(session.username, repoName);

  // Ensure parent dir exists
  await fs.mkdir(path.dirname(destPath), { recursive: true });

  try {
    await spawnGitClone(sourcePath, destPath);
  } catch (err) {
    // Clean up DB record if git clone fails
    await db.repository.delete({ where: { id: newRepo.id } }).catch(() => {});
    console.error("git clone --bare failed:", err);
    return NextResponse.json({ error: "Failed to clone repository" }, { status: 500 });
  }

  // Increment forksCount on source
  await db.repository.update({
    where: { id: sourceRepo.id },
    data: { forksCount: { increment: 1 } },
  });

  return NextResponse.json({ fork: newRepo, alreadyExists: false }, { status: 201 });
}
