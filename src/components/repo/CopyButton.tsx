"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed (e.g. permissions denied)
    }
  }

  return (
    <button
      className="btn btn-sm"
      onClick={copy}
      title="Copy raw content"
      style={{ gap: 5, fontSize: 12 }}
    >
      {copied ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
