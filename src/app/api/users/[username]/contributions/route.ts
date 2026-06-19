import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { db } from "@/lib/db";
import { getRepoPath } from "@/lib/git";
import { existsSync } from "fs";

type Params = { params: Promise<{ username: string }> };

function getGitDates(repoPath: string): Promise<string[]> {
  return new Promise((resolve) => {
    if (!existsSync(repoPath)) {
      resolve([]);
      return;
    }
    const child = spawn("git", ["log", "--format=%ad", "--date=short"], {
      cwd: repoPath,
    });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.on("close", (code) => {
      if (code !== 0 || !output.trim()) {
        resolve([]);
        return;
      }
      resolve(output.trim().split("\n").filter(Boolean));
    });
    child.on("error", () => resolve([]));
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  const { username } = await params;

  const user = await db.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const repos = await db.repository.findMany({
    where: { ownerId: user.id },
    select: { name: true },
  });

  // Aggregate commit dates across all repos
  const dateMap = new Map<string, number>();

  await Promise.all(
    repos.map(async (repo) => {
      const repoPath = getRepoPath(username, repo.name);
      const dates = await getGitDates(repoPath);
      for (const d of dates) {
        dateMap.set(d, (dateMap.get(d) ?? 0) + 1);
      }
    })
  );

  // Generate last 365 days
  const today = new Date();
  const contributions: { date: string; count: number }[] = [];

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    contributions.push({ date: dateStr, count: dateMap.get(dateStr) ?? 0 });
  }

  return NextResponse.json({ contributions });
}
