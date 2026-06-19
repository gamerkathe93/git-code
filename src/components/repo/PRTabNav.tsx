"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, FileDiff } from "lucide-react";

type Props = {
  username: string;
  repo: string;
  number: string | number;
  /** Pass "conversation" or "diff" to pre-determine active tab without reading pathname (SSR). Omit to auto-detect from pathname (client only). */
  activePath?: "conversation" | "diff";
};

export default function PRTabNav({ username, repo, number, activePath }: Props) {
  const pathname = usePathname();
  const isDiff = activePath ? activePath === "diff" : pathname?.endsWith("/diff") ?? false;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    color: active ? "var(--text-primary)" : "var(--text-muted)",
    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
    textDecoration: "none",
    transition: "color 0.15s",
  });

  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
      <Link href={`/${username}/${repo}/pulls/${number}`} style={tabStyle(!isDiff)}>
        <MessageSquare size={14} /> Conversation
      </Link>
      <Link href={`/${username}/${repo}/pulls/${number}/diff`} style={tabStyle(isDiff)}>
        <FileDiff size={14} /> Files changed
      </Link>
    </div>
  );
}
