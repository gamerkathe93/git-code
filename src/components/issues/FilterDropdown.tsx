"use client";
import { useRouter } from "next/navigation";

interface Option {
  value: string;
  label: string;
  color?: string;
}

export default function FilterDropdown({
  label,
  value,
  options,
  paramName,
  basePath,
  currentParams,
}: {
  label: string;
  value?: string;
  options: Option[];
  paramName: string;
  basePath: string;
  currentParams: Record<string, string | undefined>;
}) {
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    Object.entries(currentParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    if (e.target.value) {
      params.set(paramName, e.target.value);
    } else {
      params.delete(paramName);
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <select
      value={value || ""}
      onChange={onChange}
      style={{
        fontSize: 12,
        padding: "4px 8px",
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: "var(--bg-secondary)",
        color: value ? "var(--text)" : "var(--text-muted)",
        cursor: "pointer",
      }}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
