import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Composant Markdown partagé — rend du markdown en respectant la palette
 * slate/blue de l'app. Utilisé par le chat (réponses LLM) et par les
 * alertes (explications IA).
 *
 * Le typage `Components` de react-markdown exige un mapping vers des
 * `Components`; on passe par `any` sur les enfants pour rester simple et
 * garder un contrôle total sur le rendu via Tailwind.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdComponents: any = {
  p: ({ children }: any) => (
    <p className="mb-2.5 last:mb-0 [&:not(:first-child)]:mt-2.5 leading-7">{children}</p>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-slate-700">{children}</em>
  ),
  ul: ({ children }: any) => (
    <ul className="my-3 ml-6 list-disc space-y-1.5 marker:text-slate-300">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-3 ml-6 list-decimal space-y-1.5 marker:text-slate-300">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-7 pl-1">{children}</li>
  ),
  h1: ({ children }: any) => (
    <h1 className="mb-3 mt-5 text-[22px] font-semibold tracking-[-0.02em] text-slate-900">{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="mb-2.5 mt-4 border-b border-slate-100 pb-1.5 text-[18px] font-semibold tracking-[-0.01em] text-slate-900">{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="mb-2 mt-3 text-[15.5px] font-semibold text-slate-900">{children}</h3>
  ),
  code: ({ children }: any) => (
    <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[12.5px] text-slate-800 ring-1 ring-slate-200/70">
      {children}
    </code>
  ),
  pre: ({ children }: any) => (
    <pre className="my-3 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[12.5px] leading-6">
      {children}
    </pre>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="my-3 rounded-r-xl border-l-2 border-slate-300 bg-slate-50 px-4 py-2 text-slate-700 not-italic">
      {children}
    </blockquote>
  ),
  a: ({ children, href }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline decoration-blue-200 underline-offset-2 transition-colors hover:decoration-blue-500"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-5 border-slate-200" />,
  table: ({ children }: any) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead>{children}</thead>,
  tbody: ({ children }: any) => <tbody>{children}</tbody>,
  tr: ({ children }: any) => <tr className="even:bg-slate-50/40">{children}</tr>,
  th: ({ children }: any) => (
    <th className="border border-slate-200 bg-slate-50/70 px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-600">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-slate-200 px-3 py-2 text-slate-700">{children}</td>
  ),
}

export default function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {source}
    </ReactMarkdown>
  )
}
