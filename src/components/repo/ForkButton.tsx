"use client";
import { useState } from "react";
import { GitFork } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function ForkButton({
  username,
  repo,
  initialCount,
  currentUserFork,
}: {
  username: string;
  repo: string;
  initialCount: number;
  currentUserFork?: string | null;
}) {
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [forked, setForked] = useState(!!currentUserFork);
  const [forkOwner, setForkOwner] = useState<string | null>(currentUserFork ?? null);

  async function handleFork() {
    if (forked || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/repos/${username}/${repo}/fork`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (!data.alreadyExists) {
          setCount((c) => c + 1);
        }
        setForked(true);
        // Redirect to the fork — derive the fork owner from the fork record
        const forkUsername = data.fork?.owner?.username ?? null;
        if (forkUsername) {
          setForkOwner(forkUsername);
          window.location.href = `/${forkUsername}/${repo}`;
        } else {
          // fallback: navigate to the fork via the returned repo data
          window.location.href = window.location.href;
        }
      }
    } catch (err) {
      console.error("Fork failed:", err);
    } finally {
      setLoading(false);
    }
  }

  if (forked && forkOwner) {
    return (
      <a
        href={`/${forkOwner}/${repo}`}
        className="btn btn-sm btn-primary"
        style={{ display: "flex", alignItems: "center", gap: 4 }}
      >
        <GitFork size={12} />
        Forked ✓ {count > 0 && formatNumber(count)}
      </a>
    );
  }

  return (
    <button
      className="btn btn-sm"
      onClick={handleFork}
      disabled={loading}
      style={{ display: "flex", alignItems: "center", gap: 4 }}
    >
      <GitFork size={12} />
      {loading ? "Forking…" : "Fork"} {count > 0 && formatNumber(count)}
    </button>
  );
}
