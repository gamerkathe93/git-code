import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendCommentEmail, sendMentionEmail } from "@/lib/email";

type Params = { params: Promise<{ owner: string; repo: string; number: string }> };

async function resolveRepo(owner: string, repoName: string) {
  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return null;
  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  return repo ? { ownerUser, repo } : null;
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, number } = await params;
  const prNumber = parseInt(number, 10);

  const resolved = await resolveRepo(owner, repoName);
  if (!resolved) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { repo } = resolved;

  const pr = await db.pullRequest.findUnique({
    where: { repoId_number: { repoId: repo.id, number: prNumber } },
  });
  if (!pr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Use (db as any) because Prisma client may not have the inline fields typed
  // if the migration hasn't run yet to regenerate the client
  const comments = await (db as any).comment.findMany({
    where: { pullRequestId: pr.id },
    include: { author: { select: { username: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, number } = await params;
  const prNumber = parseInt(number, 10);

  const resolved = await resolveRepo(owner, repoName);
  if (!resolved) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { repo } = resolved;

  const pr = await db.pullRequest.findUnique({
    where: { repoId_number: { repoId: repo.id, number: prNumber } },
  });
  if (!pr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { body, path, lineRef, side } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Comment body is required" }, { status: 400 });

  // lineRef stored as Int in schema — parse if provided
  const lineRefInt = lineRef != null ? parseInt(String(lineRef), 10) : null;

  const comment = await (db as any).comment.create({
    data: {
      body,
      authorId: session.userId,
      pullRequestId: pr.id,
      path: path ?? null,
      lineRef: !isNaN(lineRefInt as number) ? lineRefInt : null,
      side: side ?? null,
    },
    include: { author: { select: { username: true, name: true, avatarUrl: true } } },
  });

  await db.pullRequest.update({ where: { id: pr.id }, data: { updatedAt: new Date() } });

  // Extract @mentions and notify each mentioned user
  const mentionRegex = /\B@([a-zA-Z0-9_-]+)/g;
  const mentionedUsernames = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = mentionRegex.exec(body)) !== null) {
    mentionedUsernames.add(match[1]);
  }

  const prCommentUrl = `/${owner}/${repoName}/pulls/${prNumber}`;

  const mentionNotifications = Array.from(mentionedUsernames).map(async (username) => {
    const mentionedUser = await db.user.findUnique({ where: { username }, select: { id: true, email: true } });
    if (mentionedUser && mentionedUser.id !== session.userId) {
      await db.notification.create({
        data: {
          userId: mentionedUser.id,
          type: "mention",
          title: `${session.username} mentioned you in PR #${prNumber}`,
          body: body.slice(0, 100),
          url: prCommentUrl,
        },
      });
      if (mentionedUser.email) {
        sendMentionEmail(mentionedUser.email, session.username, "a PR comment", prCommentUrl).catch(() => {});
      }
    }
  });

  // Notify PR author of new comment (if not the commenter)
  let prAuthorNotification: Promise<unknown> = Promise.resolve();
  if (pr.authorId !== session.userId) {
    const prAuthor = await db.user.findUnique({ where: { id: pr.authorId }, select: { email: true } });
    prAuthorNotification = db.notification.create({
      data: {
        userId: pr.authorId,
        type: "issue",
        title: `New comment on PR #${prNumber}`,
        body: body.slice(0, 100),
        url: prCommentUrl,
      },
    });
    if (prAuthor?.email) {
      sendCommentEmail(prAuthor.email, session.username, `PR #${prNumber}`, prCommentUrl).catch(() => {});
    }
  }

  await Promise.all([...mentionNotifications, prAuthorNotification]);

  return NextResponse.json({ comment }, { status: 201 });
}
