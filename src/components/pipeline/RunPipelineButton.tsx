"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader, Zap } from "lucide-react";

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
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    setSuccess(false);
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
      setSuccess(true);
      setTimeout(() => { setSuccess(false); router.refresh(); }, 1200);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes rpbSpin { to { transform: rotate(360deg); } }
        @keyframes rpbPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.92); }
          70%  { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes rpbGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(58,212,86,0); }
          50%       { box-shadow: 0 0 0 6px rgba(58,212,86,0.25); }
        }
        .rpb-btn {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 13px; font-weight: 600;
          padding: 7px 14px; border-radius: 8px;
          border: none; cursor: pointer;
          transition: transform 0.15s, background 0.2s, box-shadow 0.2s;
          position: relative; overflow: hidden;
        }
        .rpb-btn:active:not(:disabled) { transform: scale(0.96); }
        .rpb-btn:disabled { cursor: not-allowed; opacity: 0.75; }
        .rpb-btn-default {
          background: linear-gradient(135deg, #238636, #2ea043);
          color: #fff;
          box-shadow: 0 1px 4px rgba(46,160,67,0.4);
        }
        .rpb-btn-default:hover:not(:disabled) {
          background: linear-gradient(135deg, #2ea043, #3fb950);
          box-shadow: 0 2px 10px rgba(46,160,67,0.5);
          transform: translateY(-1px);
        }
        .rpb-btn-loading {
          background: linear-gradient(135deg, #1c7ed6, #1971c2);
          color: #fff;
          box-shadow: 0 1px 4px rgba(28,126,214,0.4);
          animation: rpbPop 0.3s ease;
        }
        .rpb-btn-success {
          background: linear-gradient(135deg, #3fb950, #2ea043);
          color: #fff;
          animation: rpbGlow 1.2s ease;
        }
        .rpb-spin { animation: rpbSpin 0.8s linear infinite; }
      `}</style>

      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <button
          className={`rpb-btn ${success ? "rpb-btn-success" : loading ? "rpb-btn-loading" : "rpb-btn-default"}`}
          onClick={run}
          disabled={loading}
        >
          {loading ? (
            <Loader size={13} className="rpb-spin" />
          ) : success ? (
            <Zap size={13} />
          ) : (
            <Play size={13} />
          )}
          {loading ? "Starting…" : success ? "Triggered!" : "Run pipeline"}
        </button>
        {error && (
          <span style={{ fontSize: 12, color: "#f85149", maxWidth: 220, textAlign: "right" }}>{error}</span>
        )}
      </div>
    </>
  );
}
