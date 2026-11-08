import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold" style={{ color: "var(--db-text-primary)" }}>
      {children}
    </strong>
  ),
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2"
      style={{ color: "var(--db-accent)" }}
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded px-1 py-0.5 text-xs" style={{ background: "var(--db-surface-2)" }}>
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead style={{ background: "var(--db-surface-2)" }}>{children}</thead>,
  th: ({ children }) => (
    <th
      className="px-2 py-1 text-left font-semibold"
      style={{ border: "var(--db-border-width) solid var(--db-border)", color: "var(--db-text-primary)" }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1" style={{ border: "var(--db-border-width) solid var(--db-border)" }}>
      {children}
    </td>
  ),
};

export default function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm [&_:last-child]:mb-0" style={{ color: "var(--db-text-primary)" }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
