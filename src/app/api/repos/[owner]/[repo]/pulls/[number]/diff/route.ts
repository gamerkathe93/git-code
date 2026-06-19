import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getRepoPath } from "@/lib/git";
import { spawn } from "child_process";

type Params = { params: Promise<{ owner: string; repo: string; number: string }> };

type DiffLine = {
  type: "add" | "remove" | "context";
  content: string;
  oldLine: number | null;
  newLine: number | null;
};

type DiffHunk = {
  header: string;
  lines: DiffLine[];
};

type DiffFile = {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
};

function runGitDiff(repoPath: string, base: string, head: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["diff", base, head, "--unified=3"], {
      cwd: repoPath,
      env: { ...process.env, GIT_DIR: repoPath },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      // git diff exits 1 when there are differences — that's normal
      if (code !== null && code > 1) {
        reject(new Error(`git diff exited ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
    child.on("error", reject);
  });
}

function parseUnifiedDiff(raw: string): { files: DiffFile[]; totalAdditions: number; totalDeletions: number } {
  const lines = raw.split("\n");
  const files: DiffFile[] = [];
  let totalAdditions = 0;
  let totalDeletions = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Start of a new file diff
    if (line.startsWith("diff --git ")) {
      i++;
      // Skip index line(s)
      while (i < lines.length && (lines[i].startsWith("index ") || lines[i].startsWith("new file") || lines[i].startsWith("deleted file") || lines[i].startsWith("old mode") || lines[i].startsWith("new mode"))) {
        i++;
      }

      let oldPath = "";
      let newPath = "";

      if (i < lines.length && lines[i].startsWith("--- ")) {
        oldPath = lines[i].replace(/^--- (a\/)?/, "").trim();
        i++;
      }
      if (i < lines.length && lines[i].startsWith("+++ ")) {
        newPath = lines[i].replace(/^\+\+\+ (b\/)?/, "").trim();
        i++;
      }

      const file: DiffFile = { oldPath, newPath, hunks: [], additions: 0, deletions: 0 };

      // Parse hunks
      while (i < lines.length && !lines[i].startsWith("diff --git ")) {
        const hunkLine = lines[i];
        if (!hunkLine.startsWith("@@")) {
          i++;
          continue;
        }

        // Parse @@ -oldStart,oldCount +newStart,newCount @@ optional context
        const hunkMatch = hunkLine.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/);
        if (!hunkMatch) {
          i++;
          continue;
        }

        const oldStart = parseInt(hunkMatch[1], 10);
        const newStart = parseInt(hunkMatch[3], 10);
        const hunkHeader = hunkLine;
        i++;

        const hunk: DiffHunk = { header: hunkHeader, lines: [] };
        let oldLine = oldStart;
        let newLine = newStart;

        while (i < lines.length && !lines[i].startsWith("@@") && !lines[i].startsWith("diff --git ")) {
          const diffLine = lines[i];

          if (diffLine.startsWith("+")) {
            hunk.lines.push({ type: "add", content: diffLine.slice(1), oldLine: null, newLine: newLine++ });
            file.additions++;
            totalAdditions++;
          } else if (diffLine.startsWith("-")) {
            hunk.lines.push({ type: "remove", content: diffLine.slice(1), oldLine: oldLine++, newLine: null });
            file.deletions++;
            totalDeletions++;
          } else if (diffLine.startsWith("\\")) {
            // "\ No newline at end of file" — skip
          } else {
            // context line (starts with space or is empty at end of hunk)
            hunk.lines.push({ type: "context", content: diffLine.slice(1), oldLine: oldLine++, newLine: newLine++ });
          }
          i++;
        }

        file.hunks.push(hunk);
      }

      files.push(file);
    } else {
      i++;
    }
  }

  return { files, totalAdditions, totalDeletions };
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, number } = await params;
  const prNumber = parseInt(number, 10);

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pr = await db.pullRequest.findUnique({
    where: { repoId_number: { repoId: repo.id, number: prNumber } },
  });
  if (!pr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repoPath = getRepoPath(owner, repoName);

  try {
    const raw = await runGitDiff(repoPath, pr.baseBranch, pr.headBranch);
    const result = parseUnifiedDiff(raw);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to compute diff" }, { status: 500 });
  }
}
