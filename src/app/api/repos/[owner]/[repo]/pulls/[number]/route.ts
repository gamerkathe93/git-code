import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

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
  const { action, title, body: prBody } = body;

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
    newState = "merged";
    mergedAt = new Date();
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
