import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Plain zinc-theme markdown renderer for the top-level legal pages
// (app/legal/*), which sit outside the dashboard shell's .dashboard-shell
// scope and so don't have the --db-* tokens available - see
// components/AssistantMarkdown.tsx for the dashboard-shell equivalent.
const components: Components = {
  p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-zinc-700 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-zinc-700 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-zinc-900 underline underline-offset-2">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-100">{children}</thead>,
  th: ({ children }) => <th className="border border-zinc-200 px-2 py-1 text-left font-semibold text-zinc-800">{children}</th>,
  td: ({ children }) => <td className="border border-zinc-200 px-2 py-1 text-zinc-700">{children}</td>,
};

export default function LegalMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
