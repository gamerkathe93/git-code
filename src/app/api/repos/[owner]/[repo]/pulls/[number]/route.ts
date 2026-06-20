import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import path from "path";
import { spawnSync } from "child_process";
import fs from "fs";

type Params = { params: Promise<{ owner: string; repo: string; number: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, number } = await params;
  const prNumber = parseInt(number);

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

  // Only PR author or repo owner can update
  if (session.userId !== pr.authorId && session.username !== owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { action, title, body: prBody, strategy = "merge", isDraft } = body;

  // Handle isDraft toggle separately
  if (typeof isDraft === "boolean" && session.username === owner) {
    await db.pullRequest.update({ where: { id: pr.id }, data: { isDraft } });
    return NextResponse.json({ success: true });
  }

  let newState = pr.state;
  let mergedAt = pr.mergedAt;

  if (action === "close" && pr.state === "open") {
    newState = "closed";
  } else if (action === "reopen" && pr.state === "closed") {
    newState = "open";
  } else if (action === "merge" && pr.state === "open") {
    // Only repo owner can merge
    if (session.username !== owner) {
      return NextResponse.json({ error: "Only repo owner can merge" }, { status: 403 });
    }

    // Check branch protection
    const protection = await (db as any).branchProtection.findFirst({
      where: {
        repoId: repo.id,
        OR: [
          { pattern: pr.baseBranch },
          { pattern: "*" },
        ]
      }
    });

    if (protection) {
      if (protection.requirePullRequest && protection.requiredApprovals > 0) {
        // Count approved reviews
        const approvals = await (db as any).pRReviewer.count({
          where: { pullRequestId: pr.id, state: "approved" }
        });
        if (approvals < protection.requiredApprovals) {
          return NextResponse.json({
            error: `Branch protection requires ${protection.requiredApprovals} approval(s). This PR has ${approvals}.`,
            code: "PROTECTION_REQUIRED_APPROVALS",
            required: protection.requiredApprovals,
            current: approvals,
          }, { status: 422 });
        }
      }

      if (protection.requireStatusChecks) {
        // Check latest pipeline for this PR's head branch
        const pipeline = await db.pipeline.findFirst({
          where: { repoId: repo.id, branch: pr.headBranch },
          orderBy: { createdAt: "desc" },
        });
        if (!pipeline || pipeline.status !== "success") {
          return NextResponse.json({
            error: "Branch protection requires passing status checks. No successful pipeline found for this branch.",
            code: "PROTECTION_STATUS_CHECKS",
          }, { status: 422 });
        }
      }
    }

    newState = "merged";
    mergedAt = new Date();

    // Perform git merge in a temp working directory cloned from the bare repo
    const GIT_REPO_PATH = process.env.GIT_REPO_PATH || path.join(process.cwd(), "repos");
    const bareRepoPath = path.join(GIT_REPO_PATH, owner, `${repoName}.git`);
    const tmpWorkDir = `/tmp/gitcode-merge-${pr.id}-${Date.now()}`;

    function gitCmd(args: string[], cwd: string) {
      return spawnSync("git", args, { cwd, encoding: "utf8" });
    }

    try {
      gitCmd(["clone", bareRepoPath, tmpWorkDir], "/tmp");
      gitCmd(["checkout", pr.baseBranch], tmpWorkDir);

      if (strategy === "squash") {
        gitCmd(["merge", "--squash", `origin/${pr.headBranch}`], tmpWorkDir);
        gitCmd(
          ["commit", "-m", `Squash merge PR #${pr.number}: ${pr.title}`, "--author", "GitCode <noreply@gitcode.dev>"],
          tmpWorkDir
        );
      } else if (strategy === "rebase") {
        gitCmd(["rebase", `origin/${pr.headBranch}`], tmpWorkDir);
      } else {
        // Standard merge commit
        gitCmd(
          ["merge", "--no-ff", `origin/${pr.headBranch}`, "-m", `Merge pull request #${pr.number}: ${pr.title}`],
          tmpWorkDir
        );
      }

      // Push merged result back to the bare repo
      gitCmd(["push", "origin", pr.baseBranch], tmpWorkDir);
    } catch (e) {
      console.error("Git merge error:", e);
      // Continue with DB update even if git operation fails
    } finally {
      try { fs.rmSync(tmpWorkDir, { recursive: true, force: true }); } catch {}
    }
  }

  const updated = await db.pullRequest.update({
    where: { id: pr.id },
    data: {
      state: newState,
      mergedAt,
      title: title ?? pr.title,
      body: prBody ?? pr.body,
    },
    include: {
      author: { select: { username: true, avatarUrl: true } },
    },
  });

  // Auto-close referenced issues
  if (action === "merge") {
    const refText = `${pr.title} ${pr.body}`;
    const closePatterns = /(?:closes?|fixes?|resolves?)\s+#(\d+)/gi;
    const matches = [...refText.matchAll(closePatterns)];

    for (const match of matches) {
      const issueNumber = parseInt(match[1]);
      try {
        const issue = await db.issue.findUnique({
          where: { repoId_number: { repoId: repo.id, number: issueNumber } },
        });
        if (issue && issue.state === "open") {
          await db.issue.update({
            where: { id: issue.id },
            data: { state: "closed", closedAt: new Date() },
          });
          // Add a comment on the issue saying it was auto-closed
          await db.comment.create({
            data: {
              body: `Closed via pull request #${pr.number}: ${pr.title}`,
              authorId: session.userId,
              issueId: issue.id,
            },
          });
        }
      } catch (e) {
        console.error("Auto-close issue error:", e);
      }
    }
  }

  // Create notification for repo owner on close/merge (if they're not the actor)
  if ((action === "close" || action === "merge") && session.userId !== ownerUser.id) {
    await db.notification.create({
      data: {
        userId: ownerUser.id,
        title: action === "merge" ? `PR merged: ${pr.title}` : `PR closed: ${pr.title}`,
        body: `Pull request #${prNumber} in ${repoName} was ${action}d by ${session.username}.`,
        type: "pull_request",
        url: `/${owner}/${repoName}/pulls/${prNumber}`,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ pull: updated });
}
