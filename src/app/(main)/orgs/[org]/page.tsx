import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Users, BookMarked } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ org: string }> };

export async function generateMetadata({ params }: Params) {
  const { org } = await params;
  return { title: org };
}

export default async function OrgPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { org: orgName } = await params;

  const org = await db.organization.findUnique({
    where: { name: orgName },
    include: {
      owner: { select: { username: true } },
      members: { include: { user: { select: { username: true, name: true, avatarUrl: true } } } },
    },
  });
  if (!org) notFound();

  const isOwner = org.ownerId === session.userId;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="card" style={{ padding: 24, marginBottom: 24, display: "flex", alignItems: "center", gap: 20 }}>
        <img
          src={org.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${org.name}`}
          alt={org.name}
          style={{ width: 72, height: 72, borderRadius: 12, border: "2px solid var(--border)" }}
        />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{org.displayName}</h1>
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>@{org.name}</div>
          {org.description && <p style={{ fontSize: 14, marginTop: 6, color: "var(--text-muted)" }}>{org.description}</p>}
        </div>

      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <BookMarked size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ color: "var(--text-muted)" }}>No repositories yet.</p>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={14} /> Members ({org.members.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(org.members as any[]).map((m) => (
              <Link key={m.userId} href={`/${m.user.username}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--text)" }}>
                <img
                  src={m.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user.username}`}
                  alt=""
                  style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border)" }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.user.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.role}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
