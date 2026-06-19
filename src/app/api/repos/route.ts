import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initBareRepo, initWithReadme } from "@/lib/git";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const language = searchParams.get("language");
  const q = searchParams.get("q");
  const visibility = searchParams.get("visibility");
  const sort = searchParams.get("sort") ?? "updatedAt";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (owner) {
    const ownerUser = await db.user.findUnique({ where: { username: owner } });
    if (ownerUser) {
      where.ownerId = ownerUser.id;
      // Show private repos only to owner
      if (owner !== session.username) where.isPrivate = false;
    }
  } else {
    where.isPrivate = false;
  }

  if (language) where.language = language;
  if (visibility === "public") where.isPrivate = false;
  else if (visibility === "private") { where.isPrivate = true; where.ownerId = session.userId; }

  if (q) {
    where.OR = [{ name: { contains: q } }, { description: { contains: q } }];
  }

  const orderBy =
    sort === "stars" ? { starsCount: "desc" as const }
    : sort === "name" ? { name: "asc" as const }
    : { updatedAt: "desc" as const };

  const repos = await db.repository.findMany({
    where,
    orderBy,
    include: {
      owner: { select: { username: true, name: true, avatarUrl: true } },
      _count: { select: { issues: true, pullRequests: true } },
    },
    take: 50,
  });

  return NextResponse.json({ repos, total: repos.length });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, description = "", isPrivate = false, defaultBranch = "main", initReadme = false, license } = body;

    if (!name) return NextResponse.json({ error: "Repository name is required" }, { status: 400 });
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
      return NextResponse.json({ error: "Invalid repository name" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const existing = await db.repository.findUnique({
      where: { ownerId_name: { ownerId: user.id, name } },
    });
    if (existing) return NextResponse.json({ error: "Repository already exists" }, { status: 409 });

    const repo = await db.repository.create({
      data: { name, description, isPrivate, defaultBranch, license: license ?? "", ownerId: user.id },
    });

    await db.label.createMany({
      data: [
        { name: "bug", color: "#d73a4a", description: "Something isn't working", repoId: repo.id },
        { name: "enhancement", color: "#a2eeef", description: "New feature or request", repoId: repo.id },
        { name: "documentation", color: "#0075ca", description: "Improvements or additions to documentation", repoId: repo.id },
        { name: "question", color: "#d876e3", description: "Further information is requested", repoId: repo.id },
      ],
    });

    await initBareRepo(user.username, name);
    if (initReadme || license) {
      await initWithReadme(user.username, name, description, defaultBranch, initReadme, license);
    }

    return NextResponse.json(
      { repo: { ...repo, owner: { username: user.username, name: user.name } } },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create repo error:", err);
    return NextResponse.json({ error: "Failed to create repository" }, { status: 500 });
  }
}
