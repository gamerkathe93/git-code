import { marked } from "marked";

// Custom renderer — use the override approach (compatible with marked v12)
marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    link(token: any) {
      const href: string = token.href ?? "";
      const title: string | null = token.title ?? null;
      const text: string = token.text ?? "";
      const titleAttr = title ? ` title="${title}"` : "";
      const external = href.startsWith("http");
      return `<a href="${href}"${titleAttr}${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${text}</a>`;
    },
    code(token: any) {
      const text: string = token.text ?? "";
      const lang: string = token.lang || "text";
      const escaped = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<pre class="md-code-block"><code class="language-${lang}">${escaped}</code></pre>`;
    },
  },
});

/**
 * Preprocesses markdown to convert @mentions, #issue references, and bare SHA hashes
 * into Markdown links before rendering.
 */
export function processReferences(
  md: string,
  context: { owner: string; repo: string }
): string {
  const { owner, repo } = context;

  // Replace @username with a Markdown link to the user profile
  let processed = md.replace(/\B@([a-zA-Z0-9_-]+)/g, (_match, username) => {
    return `[@${username}](/${username})`;
  });

  // Replace #123 with a link to the issue
  processed = processed.replace(/\B#(\d+)/g, (_match, num) => {
    return `[#${num}](/${owner}/${repo}/issues/${num})`;
  });

  // Replace bare 40-character hex SHA references with commit links
  processed = processed.replace(/\b([0-9a-f]{40})\b/g, (_match, sha) => {
    return `[\`${sha.slice(0, 7)}\`](/${owner}/${repo}/commits/${sha})`;
  });

  return processed;
}

export function renderMarkdown(
  md: string,
  context?: { owner: string; repo: string }
): string {
  if (!md) return "";
  const source = context ? processReferences(md, context) : md;
  return marked.parse(source) as string;
}
