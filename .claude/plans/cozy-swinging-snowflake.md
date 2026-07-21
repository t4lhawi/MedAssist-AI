# Premium Redesign — Assistant IA Page

## Context

The Assistant IA page (`/assistant`) is the only RAG-backed chat surface in MedAssist AI. Today it works, but the visual treatment is closer to a generic admin module than to a modern AI product: a warning banner disclaimer, cramped bubbles, tiny source pills, a small dot-typing animation, and a drawer with bordered cards. The goal of this task is **UI-only** — turn the page into a ChatGPT/Claude/Notion-style AI workspace while preserving every existing behavior (RAG, chat history, markdown, sources, suggestions, history loading, copy, typing, stop, JWT auth, hooks, business logic, types, routes).

The app shell is fixed by `App.tsx` (Navbar + Sidebar + scrollable `<main>`). The Assistant page owns its inner section. The redesign lives entirely inside two files plus a tiny additive block in the global stylesheet for the new shimmer keyframes.

## Files to modify

| File | Change |
|---|---|
| `frontend/src/pages/AssistantPage.tsx` | Restructure layout: premium header (title + subtitle + status row + History / New conversation buttons) and a small "premium information card" disclaimer replacing the amber warning banner. Keeps `PageHeader` as a header title; the rest of the meta row becomes a custom right cluster. Same default export, same component name, no prop changes. |
| `frontend/src/components/Chat/ChatInterface.tsx` | Full UI overhaul. Keeps every state variable, effect, callback, ref, and API call. Same default export. Visible changes: chat container styling, large gradient avatar, no-bubble assistant messages, redesigned source cards, premium thinking animation, redesigned empty state, redesigned floating composer, redesigned history panel, premium delete-confirmation modal via the existing `Modal` primitive. |
| `frontend/src/components/ui/Markdown.tsx` | Improve typography/spacing only (h1–h3, lists, code, tables, blockquote, links). Does **not** change the render pipeline (`ReactMarkdown` + `remark-gfm`), the prop signature (`{ source: string }`), or the default export. |
| `frontend/src/index.css` | Append only: `@keyframes shimmer` (translateX) and `@keyframes pulseDot` (opacity pulse) for the new thinking state. No removals. |

All other files (`App.tsx`, `api.ts`, `AuthContext`, hooks, types) are untouched.

## Layout target

```
┌─ #F5F5F7 page background ─────────────────────────────────────────┐
│  Header (premium, white card)                                     │
│    [gradient logo] AI Assistant                                    │
│                   "Ask questions about indexed hospital docs"     │
│                                                  [docs] [RAG] [📅]│
│                                                  [History] [New]  │
│  Premium disclaimer card (amber-tinted, shield, dismiss)         │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Chat canvas (white, large radius, soft shadow)            │   │
│  │     max-w-3xl, centered                                    │   │
│  │     …messages… (no bubble for assistant, bubble for user)  │   │
│  └────────────────────────────────────────────────────────────┘   │
│  Floating composer (rounded-3xl, large shadow, gradient send)   │
└──────────────────────────────────────────────────────────────────┘
```

## Design system choices

- **Page bg**: `#F5F5F7` (already in CSS root). Chat canvas = `bg-white` with `rounded-3xl`, `shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_48px_-16px_rgba(15,23,42,0.08)]`.
- **Max conversation width**: `max-w-3xl` (768 px) — close to the requested 900 px while keeping the canvas visible inside a sidebar+padding shell on common laptop sizes. Container outer wrapper stays `max-w-5xl` to host the canvas with comfortable side padding.
- **Spacing**: messages separated by `space-y-7`. Composer area has `pt-3 pb-5`.
- **Type scale**: body `text-[15px] leading-7`, headings tracked (`tracking-[-0.02em]`), secondary text `text-slate-500 text-[13px]`.
- **Borders**: hairline `border-slate-200/70`. Rounded `rounded-2xl` for cards, `rounded-3xl` for surfaces (canvas, composer, modal).
- **Shadows**: layer `0 1px 2px rgba(0,0,0,0.04)` + `0 12px 32px -8px rgba(15,23,42,0.08)` for cards; bigger on composer.
- **Animations**: only `opacity`, `translateY`, `scale`, `fade`. Durations `180ms` and `220ms`, easing `cubic-bezier(0.25, 0.1, 0.25, 1)` (the existing `--ease-out`). Respect `prefers-reduced-motion` (the existing media query already does this).

## Header

- New header structure (custom, replacing the current `PageHeader` use for the action row):
  - **Left**: large gradient logo tile (`h-10 w-10 rounded-2xl`, blue gradient) with `Stethoscope` icon; "AI Assistant" (`text-[20px] font-semibold tracking-[-0.02em]`); subtitle "Ask questions about indexed hospital documents" (`text-[13px] text-slate-500`).
  - **Right cluster (top row)**: three pill chips — "X indexed documents" (`BookOpen` icon, slate), "RAG · Online" (`Sparkles` icon, emerald), today's date (`Calendar`, slate). All `rounded-full px-2.5 py-1 text-[11.5px] font-medium`, separated by `gap-2`.
  - **Right cluster (bottom row)**: two pill buttons — History (`Clock3` + count) and New conversation (`SquarePen`). Each `rounded-full px-3.5 py-1.5 text-[12.5px] font-medium`, hover `bg-slate-100`, scale on press.
- The existing `PageHeader` is reused for the title block (call it with `category="AI Workspace"`, `title="AI Assistant"`, `subtitle="Ask questions about indexed hospital documents"`) and the right cluster is passed via the `actions` prop as a `flex flex-col items-end gap-2` group. This keeps `PageHeader` API unchanged.
- Date: `new Date().toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' })` styled as a chip.

## Disclaimer

- Replace the amber warning bar with a soft information card:
  - `flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/40 backdrop-blur px-4 py-3`.
  - Left: small shield tile (`h-8 w-8 rounded-xl bg-amber-100 text-amber-700` with `ShieldCheck`).
  - Middle: title "Medical information only" (`text-[13px] font-semibold text-amber-900`) + description "MedAssist helps you find information in indexed hospital documents. It does not replace medical or technical judgment from a qualified professional." (`text-[12.5px] text-amber-800/80 leading-relaxed`).
  - Right: dismiss `X` button (`h-7 w-7 rounded-full text-amber-700/70 hover:bg-amber-100`). Click toggles a local `useState<boolean>` (only UI state — no business logic); a small CSS fade-out (`opacity → 0 → height 0`) collapses the card.
- Disclaimer only shown when `!dismissed`; if dismissed it stays dismissed for the page session.

## Chat canvas

- Outer wrapper: `flex flex-1 min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[...]`.
- Messages list: `mx-auto w-full max-w-3xl px-5 py-8 sm:px-8`.
- Scroll area: keeps the current `flex-1 overflow-y-auto` behavior and `bottomRef` auto-scroll.

### Assistant message

- `article flex gap-4 group` (not inside any bubble).
- **Avatar** (much larger than today): `flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm` with `background: linear-gradient(135deg, #3B82F6, #6366F1)` and `Stethoscope` icon at `size={18}`.
- **Content column**: `flex min-w-0 flex-1 flex-col gap-3`.
  - Markdown block (no bubble, no border, no background). Body uses the improved `Markdown` component.
  - **Message actions row** (visible on group hover; sm+ always visible at low opacity): `flex items-center gap-1` with icon buttons — `Copy` / `Check`, `RotateCcw` (regenerate, disabled tooltip "Not available yet"), `Share2` (disabled), `ThumbsUp`, `ThumbsDown`. Each: `h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed`. ARIA labels per icon.
  - **Sources row**: redesigned (see below).

### User message

- `article flex justify-end`.
- Bubble: `max-w-[80%] rounded-3xl rounded-tr-md bg-slate-100 px-4 py-2.5 text-[14.5px] leading-7 text-slate-800`. Avatar above or omitted — the brief says "Simple profile circle"; render a small `h-8 w-8 rounded-full bg-slate-200 text-slate-500` with `User` icon to the right of the bubble inside a `flex items-end gap-2`.

### Sources

- Replace `SourceChip` with a richer "document card" rendered as a vertical list (one card per source) when there are sources, OR keep as a wrap of compact cards when there are >3. Spec says "Beautiful document cards" — go with a 1-per-row compact card on sm+, wrapping to 2 cols on lg+:
  - `group flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 hover:border-blue-200 hover:shadow-sm transition cursor-pointer`.
  - Left: `flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600` with `FileText` icon.
  - Middle: document name `text-[12.5px] font-medium text-slate-800 truncate`; below, `p. {page}` in `text-[11px] text-slate-400`.
  - Right: confidence badge `rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700` showing `Math.round(source.score * 100)%` — only if `source.score` is a finite number.
- Sources render in a 2-column grid (`grid sm:grid-cols-2 gap-2`) for visual balance.

### Thinking state (replaces `TypingDots`)

- Inline article with the same avatar column.
- Inside the content column: a glassy pill `inline-flex items-center gap-2.5 rounded-full bg-slate-50 px-3 py-1.5` containing:
  - The assistant avatar (smaller, `h-5 w-5 rounded-full`).
  - A 64px-wide shimmer bar (`relative overflow-hidden rounded-full bg-slate-200/80` with an animated `::after` gradient sweeping left→right, `shimmer 1.4s linear infinite`).
  - Caption text: alternates between "Searching indexed documents…" and "Generating answer…" — driven by an internal state machine: 0–900 ms = searching, 900–end = generating (or just always show "Generating answer…" for simplicity, with the shimmer being the visual cue). Going with the two-phase state via `useEffect` setTimeout.
- The avatar's gradient gets a subtle `animate-pulse` (`opacity` 0.85 ↔ 1, 2s) to indicate "thinking" without a busy spinner.

### Empty state (landing)

- Center column (`mx-auto max-w-2xl flex flex-col items-center text-center`).
- **Hero logo**: `flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-lg` with `background: linear-gradient(135deg, #3B82F6, #6366F1)` and `Sparkles` icon at 28 px.
- **Title**: "How can I help today?" (`text-[28px] font-semibold tracking-[-0.02em]`).
- **Subtitle**: `WELCOME_MESSAGE` text, `text-[14px] text-slate-500 max-w-md`.
- **Suggestion cards**: 2x2 grid (`grid sm:grid-cols-2 gap-2.5`). Each card:
  - `flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_8px_24px_-8px_rgba(37,99,235,0.18)] active:scale-[0.99]`.
  - Icon tile: `flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600`, with one of `Thermometer`, `Droplets`, `AlertTriangle`, `BookOpen` mapped by index.
  - Text block: title (a short label, e.g. "Room temperature") + description (the original `SUGGESTIONS` string). The short labels are derived via a small `SUGGESTION_META` array; the existing `SUGGESTIONS` strings are kept intact so no backend contract changes.
- **Resume previous** link (when `history.length > 0`): same as today, restyled to a quiet `text-[12.5px] text-blue-600 hover:underline`.

## Composer (floating)

- Wrapped in `footer shrink-0 px-4 pb-4 pt-2 sm:px-6` (matches today's footprint) and contains:
  - Form `group/chat relative mx-auto flex max-w-3xl items-end gap-1.5 rounded-3xl border border-slate-200 bg-white p-2 pl-4 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08),0_24px_48px_-12px_rgba(15,23,42,0.06)] transition-all duration-200 ease-out focus-within:border-blue-300 focus-within:shadow-[0_8px_28px_-6px_rgba(46,99,255,0.25),0_0_0_4px_rgba(46,99,255,0.06)]`.
  - **Attachment placeholder (future)**: `Paperclip` icon button on the left, `h-9 w-9 rounded-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700`, `disabled` (cursor + tooltip "Bientôt disponible").
  - **Textarea** (unchanged behavior: auto-grow, Enter to send, Shift+Enter newline): `max-h-40 min-h-[2.5rem] min-w-0 flex-1 resize-none bg-transparent py-2 text-[14.5px] leading-6 text-slate-900 outline-none placeholder:text-slate-400`. Placeholder: "Ask anything about the indexed hospital documents…".
  - **Voice placeholder (future)**: `Mic` icon button, same style as attachment, disabled.
  - **Send / Stop**: today's `h-9 w-9 rounded-2xl` button; gradient blue (send) or slate-900 (stop). Keeps the loading icon swap.
  - Helper row below form (already present) kept as-is: "MedAssist can make mistakes. Verify important information."

## History side panel

- Keep the existing `createPortal` drawer; rewrite visuals.
- Container: `fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out`. The 300 ms transition is preserved (existing keyframe not in the 220 ms budget, but the rest of the app uses 300 ms slide-overs; matching the app's existing convention).
- **Header**: title row `flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4`. Title: "Conversations" with `MessageSquare` icon and a count badge. Right: refresh + close, both `h-9 w-9 rounded-full hover:bg-slate-100`.
- **Search**: `SearchField` (unchanged), inside `border-b border-slate-100 px-4 py-3`.
- **Conversation list**: same `space-y-2`. The `HistoryCard` is rebuilt to match the brief:
  - Default state: `rounded-2xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 hover:bg-slate-50 transition`.
  - Top row: title (question) `text-[13.5px] font-semibold text-slate-900 truncate pr-7`.
  - Meta row: relative date + source count in `text-[11.5px] text-slate-400`. Date formatted with `Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })` (locale switch from fr-FR to en-US to match the new English-first header).
  - Preview: `mt-2 line-clamp-2 text-[12.5px] leading-5 text-slate-600`.
  - Delete `Trash2` button: `absolute right-3 top-3 h-7 w-7 rounded-full text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition`.
  - **Selected state** (current item is the open one — we don't track that today, so leave that for a follow-up; the brief mentions "selected state" but we don't currently track it; skip for this iteration to avoid logic creep — covered under "preserve all features" the selection wasn't there to begin with).
- **Delete confirmation**: replace the inline confirm with a premium modal using the existing `Modal` primitive:
  - `Modal` size `sm`, `ariaLabel="Delete conversation"`.
  - `ModalHeader` icon `Trash2` (red tone), title "Delete this conversation?", subtitle "This will permanently remove the conversation from your history."
  - `ModalBody` shows "« {truncated question} »" inside a `rounded-xl bg-slate-50 p-3 text-[12.5px] text-slate-600`.
  - `ModalFooter` with `ModalButton variant="ghost"` "Cancel" and `ModalButton variant="danger"` "Delete" with `loading` state while the API call is in flight.
  - State management: a single `useState<number | null>` for the pending delete index; opening the modal sets it, success clears it.

## Markdown styling

Inside `Markdown.tsx`, improve only the className strings:
- `h1`: `text-[22px] font-semibold tracking-[-0.02em] text-slate-900 mb-3 mt-5`.
- `h2`: `text-[18px] font-semibold tracking-[-0.01em] text-slate-900 mb-2.5 mt-4 pb-1.5 border-b border-slate-100`.
- `h3`: `text-[15.5px] font-semibold text-slate-900 mb-2 mt-3`.
- `p`: keep current.
- `ul`/`ol`: `my-3 ml-6 space-y-1.5 marker:text-slate-300`.
- `li`: `leading-7`.
- `code` (inline): `rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[12.5px] text-slate-800 ring-1 ring-slate-200/70`.
- `pre`: `my-3 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[12.5px] leading-6`.
- `blockquote`: `my-3 border-l-2 border-slate-300 bg-slate-50 px-4 py-2 text-slate-700 not-italic rounded-r-xl`.
- `a`: `text-blue-600 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-500 transition-colors`.
- `table`: `w-full text-[13px] border-collapse my-3`. `th`: `border border-slate-200 bg-slate-50/70 px-3 py-2 text-left text-[12px] font-semibold text-slate-600 uppercase tracking-wide`. `td`: `border border-slate-200 px-3 py-2 text-slate-700`.
- `hr`: `my-5 border-slate-200`.

The `Components` mapping object and the default export signature stay the same.

## Global CSS additions

Append to `frontend/src/index.css`:

```css
/* Thinking-state shimmer */
@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.shimmer-bar {
  position: relative;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.06);
}
.shimmer-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.85) 50%,
    transparent 100%
  );
  animation: shimmer 1.4s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
}
```

No other CSS changes. The existing `prefers-reduced-motion` rule already covers these animations.

## Existing utilities to reuse (do not duplicate)

- `PageHeader` from `components/ui/PageHeader.tsx` — keep using it for the title block.
- `SearchField` from `components/ui/Field.tsx` — reuse for history search.
- `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter`, `ModalButton` from `components/ui/Modal.tsx` — reuse for the delete confirmation.
- `Markdown` from `components/ui/Markdown.tsx` — reuse for assistant messages.
- Existing design tokens in `:root` (`--ease-out`, `--dur-base`, etc.) — reuse via the same Tailwind utility classes already in use.
- Existing `Stethoscope`, `Sparkles`, `ShieldAlert`, `Clock3`, etc. icons from `lucide-react`. New ones used: `FileText`, `Thermometer`, `Droplets`, `AlertTriangle`, `BookOpen` (already imported), `MessageSquare`, `MessageCircle` (already imported), `User`, `Paperclip`, `Mic`, `Share2`, `ThumbsUp`, `ThumbsDown`, `RotateCcw` (already imported), `ShieldCheck`, `Calendar`.

## Things explicitly preserved (no logic change)

- All `useState` / `useRef` / `useEffect` / `useMemo` hooks and their values.
- All API calls: `sendChat`, `getChatHistory`, `deleteChatHistoryItem`.
- All callbacks: `send`, `interrupt`, `copyMessage`, `resetChat`, `openHistoryItem`, `loadHistory`, `deleteHistoryItem`.
- The `ConversationHistoryItem` local type and `historyItemKey` helper.
- The scroll-into-view behavior and the auto-resize effect.
- The RAG context passed to `sendChat` (`messages.slice(-8)`).
- The error and interrupt handling.
- The default export name (`ChatInterface`) and signature (no props).
- The default export name (`AssistantPage`) and signature (no props).
- The RAG-disabled copy below the composer and the medical disclaimer.
- The route `/assistant` and the auth flow.

## Verification

1. **Visual / behavioral walkthrough** (manual, but expected to be the primary verification):
   - `npm run dev` (or the project's existing dev command) and navigate to `/assistant`.
   - Empty state: hero logo + title + 4 suggestion cards render; hover lift works; clicking a suggestion fills the composer and submits.
   - Composer: focus glow visible; textarea auto-grows up to the cap; Enter sends, Shift+Enter inserts newline.
   - Send: user bubble appears on the right, assistant row appears with gradient avatar, premium thinking animation runs (shimmer + label switch), then markdown answer renders with `Markdown`.
   - Sources: when present, appear as a 2-column grid of document cards with file icon, name, page, and confidence badge; hover raises and changes border.
   - Message actions: hover any assistant message; Copy/Regen/Share/ThumbsUp/ThumbsDown row appears; Copy shows a check for ~1.4 s; ThumbsUp/Down show filled state on click (UI only).
   - Stop: while loading, the send button becomes a stop button; clicking it appends "Génération interrompue." (kept as-is) and clears loading.
   - History: click "History" → drawer slides in from the right; existing conversations render as new conversation cards with title/date/preview/source count; search filters live; refresh icon reloads; delete trash icon opens a centered premium confirmation modal; confirming removes the card and the modal closes.
   - Disclaimer: amber info card has a shield, title, description, and a dismiss `X`; clicking `X` collapses the card with a fade.
   - Header: shows count of indexed documents (left as a constant placeholder chip — backend does not expose this number today; the chip is `Documents · indexed` with the existing `liveCount` removed in favor of a custom static row), RAG status, today's date, History + New conversation buttons.
   - Responsive: at <640 px, the conversation fills the width, the composer sticks to the bottom, the history drawer becomes full-screen sheet (already at `w-full max-w-md` — change max-w to `sm:max-w-md` so on mobile it's `w-full`); suggestion grid becomes 1 column; sources grid becomes 1 column on mobile.
2. **Reduced motion**: toggle `prefers-reduced-motion: reduce` in DevTools; shimmer and pulse collapse (existing global rule covers this).
3. **Keyboard**: Tab cycles header buttons → message action icons → composer → form controls. ESC closes the history drawer. Enter on a focused history card opens it.
4. **Accessibility**: every icon-only button has `aria-label`; modal uses `role="dialog" aria-modal="true"` (existing Modal primitive handles this); the thinking state uses `aria-live="polite"`.
5. **Type check / lint**: run the project's `tsc --noEmit` (or whatever the project uses) — no new type errors expected since the only added state is the local `dismissed` and `pendingDelete` booleans/numbers.
6. **No-regression spot checks**:
   - RAG: send a question and confirm the response still arrives through the existing `sendChat` flow with the same 8-message history window.
   - History: confirm new conversations appear at the top of the history list and can be reopened.
   - Markdown: paste a response containing a heading, a list, a code block, and a table — verify the new styles render.
