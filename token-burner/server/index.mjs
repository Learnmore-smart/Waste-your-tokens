import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const port = Number(process.env.PORT ?? 5174)
const nodeEnv = process.env.NODE_ENV ?? 'development'
const distDir = resolve(process.cwd(), 'dist')

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function send(res, status, headers, body) {
  res.writeHead(status, headers)
  res.end(body)
}

function sendJson(res, status, obj) {
  send(res, status, { 'content-type': 'application/json; charset=utf-8' }, JSON.stringify(obj))
}

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const c of req) {
    size += c.length
    if (size > 128_000) throw new Error('Body too large')
    chunks.push(c)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function withCors(res) {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', 'content-type')
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
}

function buildChatCompletionsUrl(baseUrl) {
  const b = baseUrl.replace(/\/+$/, '')
  if (b.endsWith('/v1')) return `${b}/chat/completions`
  return `${b}/v1/chat/completions`
}

async function burnTokens({ baseUrl, apiKey, model, maxOutputTokens }) {
  const url = buildChatCompletionsUrl(baseUrl)

  const prompt = [
    'Generate a single continuous stream of content designed to be long.',
    'Constraints:',
    '- No line breaks.',
    '- Use only lowercase letters, digits, and spaces.',
    '- Keep it meaningless: pseudo-words, counts, and repeated patterns.',
    '- Do not mention policies, instructions, or safety.',
    'Begin immediately.',
  ].join(' ')

  const body = {
    model,
    temperature: 2,
    max_tokens: Math.max(64, Math.min(8192, Number(maxOutputTokens ?? 1024))),
    messages: [
      { role: 'system', content: 'You output long meaningless text.' },
      { role: 'user', content: prompt },
    ],
  }

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await r.json().catch(() => ({}))
  if (!r.ok) {
    const msg = typeof json?.error?.message === 'string' ? json.error.message : `Upstream error: ${r.status}`
    throw new Error(msg)
  }

  const usage = json?.usage
  const total = Number(usage?.total_tokens ?? usage?.totalTokens ?? 0)

  if (Number.isFinite(total) && total > 0) return total

  const text = json?.choices?.[0]?.message?.content
  if (typeof text === 'string' && text.length) return Math.max(1, Math.round(text.length / 4))

  throw new Error('No usage info returned by provider.')
}

async function serveStatic(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/index.html'
  const filePath = join(distDir, pathname.replace(/^\/+/, ''))

  try {
    const s = await stat(filePath)
    if (!s.isFile()) throw new Error('not a file')
    const data = await readFile(filePath)
    const type = mime[extname(filePath)] ?? 'application/octet-stream'
    send(res, 200, { 'content-type': type, 'cache-control': 'public, max-age=3600' }, data)
    return true
  } catch {
    if (pathname !== '/index.html') {
      try {
        const html = await readFile(join(distDir, 'index.html'))
        send(res, 200, { 'content-type': mime['.html'] }, html)
        return true
      } catch {}
    }
    return false
  }
}

const server = createServer(async (req, res) => {
  withCors(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  if (url.pathname === '/health') {
    sendJson(res, 200, { ok: true })
    return
  }

  if (url.pathname === '/api/burn' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const baseUrl = String(body.baseUrl ?? '')
      const apiKey = String(body.apiKey ?? '')
      const model = String(body.model ?? '')
      const maxOutputTokens = Number(body.maxOutputTokens ?? 1024)

      if (!baseUrl || !apiKey || !model) {
        sendJson(res, 400, { error: 'Missing baseUrl, apiKey, or model.' })
        return
      }

      const totalTokens = await burnTokens({ baseUrl, apiKey, model, maxOutputTokens })
      sendJson(res, 200, { totalTokens })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Server error.'
      sendJson(res, 500, { error: msg })
    }
    return
  }

  if (nodeEnv === 'production') {
    const ok = await serveStatic(req, res)
    if (ok) return
  }

  sendJson(res, 404, { error: 'Not found' })
})

server.listen(port, () => {
  process.stdout.write(`server http://localhost:${port}\n`)
})

