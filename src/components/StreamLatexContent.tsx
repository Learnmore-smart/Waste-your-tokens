'use client'

import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function katexToHtml(latex: string, display: boolean): string {
  return katex.renderToString(latex, {
    displayMode: display,
    throwOnError: false,
    strict: 'ignore',
    trust: false,
  })
}

/** 纯文本 + `\(` … `\)` 行内公式；其余转义。 */
function renderPlainWithInlineParens(plain: string): string {
  if (!plain) return ''
  const parts: string[] = []
  let i = 0
  while (i < plain.length) {
    const s = plain.indexOf('\\(', i)
    if (s === -1) {
      parts.push(escapeHtml(plain.slice(i)))
      break
    }
    if (s > i) parts.push(escapeHtml(plain.slice(i, s)))
    const e = plain.indexOf('\\)', s + 2)
    if (e === -1) {
      parts.push(escapeHtml(plain.slice(s)))
      break
    }
    const inner = plain.slice(s + 2, e).trim()
    parts.push(
      `<span class="inline-block max-w-full align-middle katex-math" dir="auto">${katexToHtml(inner, false)}</span>`
    )
    i = e + 2
  }
  return parts.join('')
}

/** 在 plain 中处理 `\[ ... \]` 为 display。 */
function renderPlainWithParensAndBrackets(plain: string): string {
  if (!plain) return ''
  const out: string[] = []
  let i = 0
  while (i < plain.length) {
    const s = plain.indexOf('\\[', i)
    if (s === -1) {
      out.push(renderPlainWithInlineParens(plain.slice(i)))
      break
    }
    if (s > i) {
      out.push(renderPlainWithInlineParens(plain.slice(i, s)))
    }
    const e = plain.indexOf('\\]', s + 2)
    if (e === -1) {
      out.push(escapeHtml(plain.slice(s)))
      break
    }
    const inner = plain.slice(s + 2, e).trim()
    out.push(
      `<div class="katex-d-block my-2 flex w-full min-w-0 justify-center overflow-x-auto katex-math" dir="auto">${katexToHtml(inner, true)}</div>`
    )
    i = e + 2
  }
  return out.join('')
}

/**
 * 将 `$$` 显示公式块、其余为 plain（可含行内与 `\[ \]`）。
 * 流式末尾未闭合的 `$$` 整段当作文本转义，避免把半个公式丢给 KaTeX。
 */
export function buildStreamLatexHtml(text: string): string {
  if (!text) return ''
  const dbl = text.match(/\$\$/g)
  const count = dbl ? dbl.length : 0
  let work = text
  if (count % 2 === 1) {
    const last = text.lastIndexOf('$$')
    work = text.slice(0, last)
  }
  const chunks: string[] = []
  let w = 0
  while (w < work.length) {
    const a = work.indexOf('$$', w)
    if (a === -1) {
      chunks.push(renderPlainWithParensAndBrackets(work.slice(w)))
      break
    }
    if (a > w) {
      chunks.push(renderPlainWithParensAndBrackets(work.slice(w, a)))
    }
    const b = work.indexOf('$$', a + 2)
    if (b === -1) {
      chunks.push(escapeHtml(work.slice(a)))
      break
    }
    const inner = work.slice(a + 2, b).trim()
    if (inner) {
      chunks.push(
        `<div class="katex-d-block my-3 flex w-full min-w-0 justify-center overflow-x-auto katex-math" dir="auto">${katexToHtml(inner, true)}</div>`
      )
    }
    w = b + 2
  }
  if (count % 2 === 1) {
    chunks.push(escapeHtml(text.slice(text.lastIndexOf('$$'))))
  }
  return chunks.join('')
}

interface StreamLatexContentProps {
  text: string
  className?: string
}

export default function StreamLatexContent({ text, className }: StreamLatexContentProps) {
  const html = useMemo(() => buildStreamLatexHtml(text), [text])
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
