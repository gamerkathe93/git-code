import type { Metadata } from "next";
import Link from "next/link";
import { BookText, Plus, Edit, Clock, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Wiki" };

type Params = { params: Promise<{ username: string; repo: string }>; searchParams: Promise<{ page?: string }> };

export default async function WikiPage({ params, searchParams }: Params) {
  const { username, repo: repoName } = await params;
  const { page: selectedSlug = "home" } = await searchParams;

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();

  const pages = await db.wikiPage.findMany({
    where: { repoId: repo.id },
    include: { author: { select: { username: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const activePage = pages.find((p) => p.slug === selectedSlug) ?? pages[0] ?? null;

  if (pages.length === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <BookText size={40} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
        <p style={{ color: "var(--text-muted)", marginBottom: 12 }}>No wiki pages yet.</p>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
          Create your first wiki page to document this repository.
        </p>
        <Link href="#" className="btn btn-primary btn-sm"><Plus size={13} /> Create your first wiki page</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 24 }}>
      {/* Main content */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <BookText size={16} /> Wiki{activePage ? ` · ${activePage.title}` : ""}
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            {activePage && (
              <button className="btn btn-sm"><Edit size={13} /> Edit page</button>
            )}
            <Link href="#" className="btn btn-primary btn-sm"><Plus size={13} /> New page</Link>
          </div>
        </div>

        {activePage ? (
          <>
            <div className="card" style={{ padding: "24px 32px" }}>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", fontSize: 14, lineHeight: 1.8, color: "var(--text)", margin: 0 }}>
                {activePage.content || "(This page has no content yet.)"}
              </pre>
            </div>
            <div style={{ marginTop: 16, color: "var(--text-muted)", fontSize: 13, display: "flex", gap: 12 }}>
              <span>
                <Clock size={13} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                Last edited by{" "}
                <strong>
                  <Link href={`/${activePage.author.username}`} style={{ color: "var(--text)" }}>
                    {activePage.author.name || activePage.author.username}
                  </Link>
                </strong>{" "}
                on {formatDate(activePage.updatedAt.toISOString())}
              </span>
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: 32, textAlign: "center" }}>
            <FileText size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ color: "var(--text-muted)" }}>Select a page from the sidebar.</p>
          </div>
        )}
      </div>

      {/* Sidebar: page list */}
      <div>
        <div className="card">
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 13 }}>
            Pages ({pages.length})
          </div>
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={`/${username}/${repoName}/wiki?page=${page.slug}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderBottom: "1px solid var(--border-muted)",
                color: "var(--text)",
                textDecoration: "none",
                background: page.slug === (activePage?.slug ?? "") ? "var(--bg-subtle)" : undefined,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{page.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {formatDate(page.updatedAt.toISOString())} · {page.author.username}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
