"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader } from "lucide-react";

export default function RunPipelineButton({
  username,
  repo,
  branch,
}: {
  username: string;
  repo: string;
  branch: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/repos/${username}/${repo}/pipelines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch, source: "manual" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to trigger pipeline");
        setLoading(false);
        return;
      }
      setLoading(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <button className="btn btn-primary btn-sm" onClick={run} disabled={loading}
        style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {loading ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
        {loading ? "Starting…" : "Run pipeline"}
      </button>
      {error && (
        <span style={{ fontSize: 12, color: "#ef4444" }}>{error}</span>
      )}
    </div>
  );
}
