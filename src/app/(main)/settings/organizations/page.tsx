import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Plus, Crown, Shield } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Organizations — Settings" };

export default async function OrganizationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const memberships = await db.orgMember.findMany({
    where: { userId: session.userId },
    include: {
      org: {
        include: {
          _count: { select: { members: true } },
          owner: { select: { username: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Organizations</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Organizations you belong to or own.
          </p>
        </div>
        <Link href="/new-org" className="btn btn-primary btn-sm">
          <Plus size={14} /> New organization
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <Users size={40} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
          <p style={{ color: "var(--text-muted)", marginBottom: 8 }}>You don&apos;t belong to any organizations yet.</p>
          <p style={{ color: "var(--text-subtle)", fontSize: 13, marginBottom: 20 }}>
            Organizations let you collaborate with multiple people across many repositories.
          </p>
          <Link href="/new-org" className="btn btn-primary btn-sm">Create your first organization</Link>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {memberships.map((m: any, i: number) => (
            <div key={m.orgId} style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "16px 20px",
              borderBottom: i < memberships.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <img
                src={m.org.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${m.org.name}`}
                alt={m.org.name}
                style={{ width: 44, height: 44, borderRadius: 10, border: "1px solid var(--border)", flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <Link href={`/orgs/${m.org.name}`} style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
                    {m.org.displayName}
                  </Link>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>@{m.org.name}</span>
                  {m.role === "owner" ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 20, padding: "1px 7px", fontWeight: 600 }}>
                      <Crown size={9} /> Owner
                    </span>
                  ) : m.role === "admin" ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "var(--accent-hover)", background: "var(--accent-subtle)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 20, padding: "1px 7px", fontWeight: 600 }}>
                      <Shield size={9} /> Admin
                    </span>
                  ) : null}
                </div>
                {m.org.description && (
                  <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 3 }}>{m.org.description}</p>
                )}
                <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                  {m.org._count.members} member{m.org._count.members !== 1 ? "s" : ""} · Joined {timeAgo(m.joinedAt.toISOString())}
                </div>
              </div>
              <Link href={`/orgs/${m.org.name}`} className="btn btn-sm" style={{ fontSize: 12 }}>
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
