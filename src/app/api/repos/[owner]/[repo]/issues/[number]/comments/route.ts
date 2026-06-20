import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendCommentEmail, sendMentionEmail } from "@/lib/email";

type Params = { params: Promise<{ owner: string; repo: string; number: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, number } = await params;

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const issue = await db.issue.findUnique({
    where: { repoId_number: { repoId: repo.id, number: parseInt(number) } },
  });
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Comment body is required" }, { status: 400 });

  const comment = await db.comment.create({
    data: { body, authorId: session.userId, issueId: issue.id },
    include: { author: { select: { username: true, name: true, avatarUrl: true } } },
  });

  // Update issue updatedAt
  await db.issue.update({ where: { id: issue.id }, data: { updatedAt: new Date() } });

  const issueNumber = parseInt(number);

  // Extract @mentions and notify each mentioned user
  const mentionRegex = /\B@([a-zA-Z0-9_-]+)/g;
  const mentionedUsernames = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = mentionRegex.exec(body)) !== null) {
    mentionedUsernames.add(match[1]);
  }

  const commentUrl = `/${owner}/${repoName}/issues/${issueNumber}`;

  const mentionNotifications = Array.from(mentionedUsernames).map(async (username) => {
    const mentionedUser = await db.user.findUnique({ where: { username }, select: { id: true, email: true } });
    if (mentionedUser && mentionedUser.id !== session.userId) {
      await db.notification.create({
        data: {
          userId: mentionedUser.id,
          type: "mention",
          title: `${session.username} mentioned you in #${issueNumber}`,
          body: body.slice(0, 100),
          url: commentUrl,
        },
      });
      if (mentionedUser.email) {
        sendMentionEmail(mentionedUser.email, session.username, "a comment", commentUrl).catch(() => {});
      }
    }
  });

  // Notify issue author of new comment (if not the commenter)
  let issueAuthorNotification: Promise<unknown> = Promise.resolve();
  if (issue.authorId !== session.userId) {
    const issueAuthor = await db.user.findUnique({ where: { id: issue.authorId }, select: { email: true } });
    issueAuthorNotification = db.notification.create({
      data: {
        userId: issue.authorId,
        type: "issue",
        title: `New comment on issue #${issueNumber}`,
        body: body.slice(0, 100),
        url: commentUrl,
      },
    });
    if (issueAuthor?.email) {
      sendCommentEmail(issueAuthor.email, session.username, `issue #${issueNumber}`, commentUrl).catch(() => {});
    }
  }

  await Promise.all([...mentionNotifications, issueAuthorNotification]);

  return NextResponse.json({ comment }, { status: 201 });
}
