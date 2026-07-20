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
    <p className="mb-2.5 last:mb-0 [&:not(:first-child)]:mt-2.5">{children}</p>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-slate-700">{children}</em>
  ),
  ul: ({ children }: any) => (
    <ul className="my-2.5 ml-5 list-disc space-y-1 marker:text-slate-400">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-2.5 ml-5 list-decimal space-y-1 marker:text-slate-400">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-7">{children}</li>
  ),
  h1: ({ children }: any) => (
    <h1 className="mb-2 mt-3 text-[18px] font-semibold tracking-[-0.01em] text-slate-900">{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="mb-2 mt-3 text-[16.5px] font-semibold tracking-[-0.01em] text-slate-900">{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="mb-1.5 mt-2.5 text-[15px] font-semibold text-slate-900">{children}</h3>
  ),
  code: ({ children }: any) => (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12.5px] text-slate-800">
      {children}
    </code>
  ),
  pre: ({ children }: any) => (
    <pre className="my-2.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12.5px] leading-5">
      {children}
    </pre>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="my-2.5 border-l-2 border-blue-300 bg-blue-50/40 px-3 py-1.5 text-slate-700 italic">
      {children}
    </blockquote>
  ),
  a: ({ children, href }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-400"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-slate-200" />,
  table: ({ children }: any) => (
    <div className="my-2.5 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left font-semibold text-slate-700">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-slate-200 px-2.5 py-1.5 text-slate-700">{children}</td>
  ),
}

export default function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {source}
    </ReactMarkdown>
  )
}
