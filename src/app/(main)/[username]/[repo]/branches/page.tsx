import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { GitBranch, Star } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBranches, getDefaultBranch } from "@/lib/git";

type Params = { params: Promise<{ username: string; repo: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, repo } = await params;
  return { title: `Branches · ${username}/${repo}` };
}

export default async function BranchesPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName } = await params;

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();

  const [branches, defaultBranch] = await Promise.all([
    getBranches(username, repoName),
    getDefaultBranch(username, repoName),
  ]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <GitBranch size={16} /> Branches
          <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)" }}>({branches.length})</span>
        </h2>
      </div>

      {branches.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          <GitBranch size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>No branches yet. Push a commit to get started.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {(branches as any[]).map((branch, i) => {
            const isDefault = branch.name === defaultBranch;
            return (
              <div key={branch.name} style={{ padding: "14px 16px", borderBottom: i < branches.length - 1 ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                <GitBranch size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Link href={`/${username}/${repoName}/tree/${branch.name}`} style={{ fontWeight: isDefault ? 700 : 400, fontSize: 14 }}>
                    {branch.name}
                  </Link>
                  {isDefault && (
                    <span style={{ marginLeft: 8, fontSize: 10, background: "var(--accent)22", color: "var(--accent)", border: "1px solid var(--accent)44", borderRadius: 20, padding: "1px 8px" }}>
                      default
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
