import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Dashboard-token markdown renderer for the top-level legal pages
// (app/legal/*). Their chrome (LegalDocPage) now renders inside a
// .dashboard-shell wrapper, so the --db-* tokens from app/globals.css are
// in scope here too - see components/AssistantMarkdown.tsx for the
// dashboard-shell equivalent used elsewhere.
const components: Components = {
  p: ({ children }) => (
    <p className="mb-3 text-[14px] leading-relaxed last:mb-0" style={{ color: "var(--db-text-secondary)" }}>
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold" style={{ color: "var(--db-text-primary)" }}>
      {children}
    </strong>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-[14px] last:mb-0" style={{ color: "var(--db-text-secondary)" }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-2 pl-5 text-[14px] last:mb-0" style={{ color: "var(--db-text-secondary)" }}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--db-accent)" }}>
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-[14px]">{children}</table>
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
    <td
      className="px-2 py-1"
      style={{ border: "var(--db-border-width) solid var(--db-border)", color: "var(--db-text-secondary)" }}
    >
      {children}
    </td>
  ),
};

export default function LegalMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
