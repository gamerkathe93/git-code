"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function StarButton({ username, repo, initialCount, initialStarred }: {
  username: string; repo: string; initialCount: number; initialStarred: boolean;
}) {
  const [starred, setStarred] = useState(initialStarred);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/repos/${username}/${repo}/star`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setStarred(d.starred);
      setCount(d.starsCount);
    }
    setLoading(false);
  }

  return (
    <button
      className={`btn btn-sm${starred ? " btn-primary" : ""}`}
      onClick={toggle}
      disabled={loading}
      style={{ display: "flex", alignItems: "center", gap: 4 }}
    >
      <Star size={12} fill={starred ? "currentColor" : "none"} />
      {starred ? "Starred" : "Star"} {count > 0 && formatNumber(count)}
    </button>
  );
}
