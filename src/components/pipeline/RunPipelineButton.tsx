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

  async function run() {
    setLoading(true);
    await fetch(`/api/repos/${username}/${repo}/pipelines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch, source: "manual" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button className="btn btn-primary btn-sm" onClick={run} disabled={loading}
      style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {loading ? <Loader size={12} /> : <Play size={12} />}
      {loading ? "Starting…" : "Run pipeline"}
    </button>
  );
}
