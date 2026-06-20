"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DraftToggleButton({ isDraft, owner, repo, number }: { isDraft: boolean; owner: string; repo: string; number: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    await fetch(`/api/repos/${owner}/${repo}/pulls/${number}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDraft: !isDraft }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={toggle} disabled={loading} style={{
      fontSize: 12, padding: "3px 10px", borderRadius: 6,
      border: "1px solid var(--border)", background: "none",
      color: "var(--text-muted)", cursor: "pointer",
    }}>
      {loading ? "…" : isDraft ? "Mark as ready" : "Convert to draft"}
    </button>
  );
}
