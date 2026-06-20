import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendReviewEmail } from "@/lib/email";

type Params = { params: Promise<{ owner: string; repo: string; number: string }> };

async function getPR(owner: string, repoName: string, number: number) {
  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return null;
  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return null;
  const pr = await db.pullRequest.findUnique({
    where: { repoId_number: { repoId: repo.id, number } },
  });
  return pr;
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, number } = await params;
  const pr = await getPR(owner, repoName, parseInt(number));
  if (!pr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { state, body = "" } = await req.json();
  if (!state || !["approved", "changes_requested"].includes(state)) {
    return NextResponse.json({ error: "state must be 'approved' or 'changes_requested'" }, { status: 400 });
  }

  const reviewerRecord = await (db as any).pRReviewer.findUnique({
    where: { pullRequestId_reviewerId: { pullRequestId: pr.id, reviewerId: session.userId } },
  });
  if (!reviewerRecord) {
    return NextResponse.json({ error: "You are not a reviewer for this PR" }, { status: 403 });
  }

  const updated = await (db as any).pRReviewer.update({
    where: { pullRequestId_reviewerId: { pullRequestId: pr.id, reviewerId: session.userId } },
    data: { state, body },
    include: {
      reviewer: { select: { id: true, username: true, name: true, avatarUrl: true } },
    },
  });

  // Email the PR author about the review (fire-and-forget)
  if (pr.authorId !== session.userId) {
    const prAuthor = await db.user.findUnique({ where: { id: pr.authorId }, select: { email: true } });
    if (prAuthor?.email) {
      const prUrl = `/${owner}/${repoName}/pulls/${number}`;
      sendReviewEmail(prAuthor.email, session.username, state, pr.title, prUrl).catch(() => {});
    }
  }

  return NextResponse.json({ review: updated });
}
