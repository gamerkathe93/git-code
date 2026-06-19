import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus, Edit, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Wiki" };

const WIKI_PAGES = [
  { title: "Home", path: "Home", updatedAt: "2026-06-18", author: "bhavish", size: "4.2 KB" },
  { title: "Getting Started", path: "Getting-Started", updatedAt: "2026-06-15", author: "ananya", size: "8.7 KB" },
  { title: "Configuration", path: "Configuration", updatedAt: "2026-06-10", author: "bhavish", size: "12.1 KB" },
  { title: "API Reference", path: "API-Reference", updatedAt: "2026-06-16", author: "priya", size: "31.4 KB" },
  { title: "CI/CD Setup", path: "CI-CD-Setup", updatedAt: "2026-06-12", author: "rohan", size: "9.3 KB" },
  { title: "Contributing", path: "Contributing", updatedAt: "2026-06-01", author: "bhavish", size: "5.8 KB" },
];

const HOME_CONTENT = `# Welcome to GitCode Wiki

This wiki documents the GitCode platform, its configuration, and development guidelines.

## Quick Links

- [Getting Started](Getting-Started) — Install and configure GitCode in under 10 minutes
- [API Reference](API-Reference) — Complete REST API documentation
- [CI/CD Setup](CI-CD-Setup) — Configure pipelines for your repositories
- [Contributing](Contributing) — How to contribute to GitCode

## Architecture Overview

GitCode is a self-hosted Git repository management platform built with:

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Next.js API Routes + Node.js services
- **Database**: PostgreSQL (production) / SQLite (development)
- **Git Engine**: libgit2 via nodegit
- **Queue**: Redis + Bull for background jobs

## License

MIT License — see [LICENSE](../blob/main/LICENSE) for details.`;

export default function WikiPage() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 24 }}>
      {/* Main content */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpen size={16} /> Wiki · Home
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sm"><Edit size={13} /> Edit page</button>
            <Link href="#" className="btn btn-primary btn-sm"><Plus size={13} /> New page</Link>
          </div>
        </div>

        <div className="card" style={{ padding: "24px 32px" }}>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", fontSize: 14, lineHeight: 1.8, color: "var(--text)", margin: 0 }}>
            {HOME_CONTENT}
          </pre>
        </div>

        <div style={{ marginTop: 16, color: "var(--text-muted)", fontSize: 13, display: "flex", gap: 12 }}>
          <span><Clock size={13} style={{ display: "inline", verticalAlign: "middle" }} /> Last edited by <strong>bhavish</strong> on Jun 18, 2026</span>
          <Link href="#">View history</Link>
        </div>
      </div>

      {/* Sidebar: page list */}
      <div>
        <div className="card">
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 13 }}>
            Pages ({WIKI_PAGES.length})
          </div>
          {WIKI_PAGES.map((page) => (
            <Link key={page.path} href={`#wiki-${page.path}`} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--border-muted)", color: "var(--text)", textDecoration: "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{page.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {page.updatedAt} · {page.author}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-subtle)", alignSelf: "center" }}>{page.size}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
