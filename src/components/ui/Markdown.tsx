import { renderMarkdown } from "@/lib/markdown";

export default function Markdown({
  content,
  context,
  className,
}: {
  content: string;
  context?: { owner: string; repo: string };
  className?: string;
}) {
  const html = renderMarkdown(content, context);
  return (
    <div
      className={`md-body${className ? ` ${className}` : ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
