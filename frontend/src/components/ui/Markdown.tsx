import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Composant Markdown partagé — rend du markdown en respectant la palette
 * de l'app (tokens sémantiques, theming clair/sombre). Utilisé par le
 * chat (réponses LLM) et par les alertes (explications IA).
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
    <strong style={{ color: 'var(--text-primary)' }} className="font-semibold">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em style={{ color: 'var(--text-secondary)' }} className="italic">{children}</em>
  ),
  ul: ({ children }: any) => (
    <ul className="my-3 ml-6 list-disc space-y-1.5" style={{ color: 'var(--text-primary)' }}>{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-3 ml-6 list-decimal space-y-1.5" style={{ color: 'var(--text-primary)' }}>{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-7 pl-1">{children}</li>
  ),
  h1: ({ children }: any) => (
    <h1 className="mb-3 mt-5 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2
      className="mb-2.5 mt-4 border-b pb-1.5 text-[18px] font-semibold tracking-[-0.01em]"
      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="mb-2 mt-3 text-[15.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>{children}</h3>
  ),
  code: ({ children }: any) => (
    <code
      className="rounded-md px-1.5 py-0.5 font-mono text-[12.5px]"
      style={{
        background: 'var(--bg-hover)',
        color: 'var(--text-primary)',
        boxShadow: 'inset 0 0 0 1px var(--border-color)',
      }}
    >
      {children}
    </code>
  ),
  pre: ({ children }: any) => (
    <pre
      className="my-3 overflow-x-auto rounded-2xl border p-4 text-[12.5px] leading-6"
      style={{
        background: 'var(--bg-input)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
    >
      {children}
    </pre>
  ),
  blockquote: ({ children }: any) => (
    <blockquote
      className="my-3 rounded-r-xl border-l-2 px-4 py-2 not-italic"
      style={{
        background: 'var(--bg-input)',
        borderLeftColor: 'var(--border-strong)',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </blockquote>
  ),
  a: ({ children, href }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 transition-colors"
      style={{ color: 'var(--color-primary)' }}
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-5" style={{ borderColor: 'var(--border-color)' }} />,
  table: ({ children }: any) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead>{children}</thead>,
  tbody: ({ children }: any) => <tbody>{children}</tbody>,
  tr: ({ children }: any) => (
    <tr style={{ background: 'color-mix(in srgb, var(--bg-hover) 50%, transparent)' }}>{children}</tr>
  ),
  th: ({ children }: any) => (
    <th
      className="border px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wide"
      style={{
        background: 'color-mix(in srgb, var(--bg-hover) 70%, transparent)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td
      className="border px-3 py-2"
      style={{
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
    >
      {children}
    </td>
  ),
}

export default function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {source}
    </ReactMarkdown>
  )
}
