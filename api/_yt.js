const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const FALLBACK_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'
const FALLBACK_VER = '2.20261002.01.00'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const URL_RE = /https?:\/\/[^\s"'<>()[\]{}\\]+/gi
const AM_BARE_RE = /(?:^|[\s({[>])((?:www\.)?(?:alight\.(?:link|to)\/[A-Za-z0-9_-]+|alightcreative\.com\/am\/share\/[^\s"'<>]+))/gi
const clean = u => (u ? u.replace(/[.,;:!?)'"»”]+$/, '').replace(/&amp;/g, '&') : null)

export function ytId(input) {
  const s = String(input).trim()
  if (/^[\w-]{11}$/.test(s)) return s
  let u
  try { u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s) } catch { return null }
  const h = u.hostname.replace(/^www\.|^m\.|^music\./, '')
  if (h === 'youtu.be') { const id = u.pathname.split('/')[1]; return /^[\w-]{11}$/.test(id || '') ? id : null }
  if (h.endsWith('youtube.com') || h.endsWith('youtube-nocookie.com')) {
    const v = u.searchParams.get('v')
    if (v && /^[\w-]{11}$/.test(v)) return v
    return u.pathname.match(/^\/(?:shorts|live|embed|v|e)\/([\w-]{11})/)?.[1] || null
  }
  return null
}

function extractLinks(text) {
  if (!text) return []
  const out = new Set(), s = String(text)
  for (const m of s.matchAll(URL_RE)) { const u = clean(m[0]); if (u) out.add(u) }
  for (const m of s.matchAll(AM_BARE_RE)) out.add(clean('https://' + m[1]))
  return [...out]
}

function unwrapRedirect(u) {
  try {
    const x = new URL(u)
    if (/(^|\.)youtube\.com$/.test(x.hostname) && x.pathname === '/redirect') return x.searchParams.get('q') || u
  } catch {}
  return u
}

function* walk(n, depth = 0) {
  if (!n || typeof n !== 'object' || depth > 40) return
  yield n
  if (Array.isArray(n)) for (const x of n) yield* walk(x, depth + 1)
  else for (const v of Object.values(n)) yield* walk(v, depth + 1)
}

function urlsIn(node) {
  const out = new Set()
  for (const n of walk(node)) {
    if (Array.isArray(n)) continue
    for (const k of ['url', 'href']) if (typeof n[k] === 'string' && /^https?:\/\//i.test(n[k])) out.add(n[k])
  }
  return [...out]
}

function extractJson(html, markers) {
  for (const marker of markers) {
    let i = html.indexOf(marker)
    if (i < 0) continue
    i = html.indexOf('{', i + marker.length)
    if (i < 0) continue
    let depth = 0, inStr = false, esc = false
    for (let j = i; j < html.length; j++) {
      const c = html[j]
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue }
      if (c === '"') inStr = true
      else if (c === '{') depth++
      else if (c === '}' && --depth === 0) { try { return JSON.parse(html.slice(i, j + 1)) } catch { break } }
    }
  }
  return null
}

const yhttp = (url, o = {}) => fetch(url, {
  method: o.method || 'GET', redirect: 'follow', body: o.body,
  headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', Accept: o.accept || 'text/html,application/xhtml+xml,*/*;q=0.8', Cookie: 'SOCS=CAI; CONSENT=YES+1', ...(o.headers || {}) },
  signal: AbortSignal.timeout(o.timeout || 15000)
})

async function tube(endpoint, body, cfg) {
  const headers = { 'Content-Type': 'application/json', 'X-Youtube-Client-Name': '1', 'X-Youtube-Client-Version': cfg.ver, Origin: 'https://www.youtube.com' }
  if (cfg.visitor) headers['X-Goog-Visitor-Id'] = cfg.visitor
  const res = await yhttp(`https://www.youtube.com/youtubei/v1/${endpoint}?prettyPrint=false&key=${cfg.key}`, {
    method: 'POST', accept: 'application/json', headers,
    body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: cfg.ver, hl: 'en', gl: 'US', visitorData: cfg.visitor || undefined } }, ...body })
  })
  if (!res.ok) throw new Error(`youtubei/${endpoint} status ${res.status}`)
  return res.json()
}

async function getWatch(id) {
  const res = await yhttp(`https://www.youtube.com/watch?v=${id}&hl=en&bpctr=9999999999&has_verified=1`)
  const html = await res.text()
  const cfg = {
    key: html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] || FALLBACK_KEY,
    ver: html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/)?.[1] || FALLBACK_VER,
    visitor: html.match(/"VISITOR_DATA":"([^"]+)"/)?.[1] || ''
  }
  let player = extractJson(html, ['var ytInitialPlayerResponse = ', 'ytInitialPlayerResponse = '])
  const data = extractJson(html, ['var ytInitialData = ', 'window["ytInitialData"] = ', 'ytInitialData = '])
  if (!player?.videoDetails) { try { player = await tube('player', { videoId: id }, cfg) } catch {} }
  return { player, data, cfg }
}

function findCommentToken(data) {
  for (const n of walk(data)) if (n.sectionIdentifier === 'comment-item-section') for (const m of walk(n)) { const t = m.continuationCommand?.token; if (t) return t }
  return null
}

function parseBatch(j) {
  const nodes = []
  let next = null
  for (const a of j.onResponseReceivedEndpoints || []) {
    const items = a.reloadContinuationItemsCommand?.continuationItems || a.appendContinuationItemsAction?.continuationItems || []
    for (const it of items) {
      if (it.commentThreadRenderer) nodes.push(it.commentThreadRenderer)
      else if (it.commentViewModel || it.commentRenderer) nodes.push(it)
      else if (it.continuationItemRenderer) next = it.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token || it.continuationItemRenderer.button?.buttonRenderer?.command?.continuationCommand?.token || next
    }
  }
  const ents = new Map()
  for (const m of j.frameworkUpdates?.entityBatchUpdate?.mutations || []) { const p = m.payload?.commentEntityPayload; if (p && m.entityKey) ents.set(m.entityKey, p) }
  return { nodes, next, ents }
}

function readComment(node, ents) {
  const vm = node.commentViewModel?.commentViewModel || node.commentViewModel
  const pinned = /"pinnedText"|"pinnedCommentBadge"/.test(JSON.stringify(node))
  const e = vm?.commentKey ? ents.get(vm.commentKey) : null
  if (e) {
    const content = e.properties?.content
    return { text: content?.content || '', user: e.author?.displayName || '', creator: !!e.author?.isCreator, pinned, likes: e.toolbar?.likeCountNotliked || '', urls: urlsIn(content) }
  }
  const r = node.comment?.commentRenderer || node.commentRenderer
  if (!r) return null
  const text = (r.contentText?.runs || []).map(x => (x.navigationEndpoint?.urlEndpoint?.url ? ` ${x.navigationEndpoint.urlEndpoint.url} ` : x.text || '')).join('')
  return { text, user: r.authorText?.simpleText || '', creator: !!r.authorIsChannelOwner, pinned, likes: r.voteCount?.simpleText || '', urls: urlsIn(r.contentText) }
}

function replyToken(node) {
  for (const m of walk(node.replies)) { const t = m.continuationCommand?.token; if (t) return t }
  return null
}

async function getComments(token, cfg, pages) {
  const out = []
  let tok = token
  for (let p = 0; p < pages && tok; p++) {
    let j
    try { j = await tube('next', { continuation: tok }, cfg) } catch (e) { if (!out.length) throw e; break }
    const { nodes, next, ents } = parseBatch(j)
    for (const n of nodes) { const c = readComment(n, ents); if (c) out.push({ ...c, replyToken: replyToken(n) }) }
    tok = next
    if (tok) await sleep(250)
  }
  return out
}

async function getReplies(parents, cfg, max = 15) {
  const pick = parents.filter(c => c.replyToken).sort((a, b) => Number(b.creator) - Number(a.creator) || Number(b.pinned) - Number(a.pinned)).slice(0, max)
  const out = []
  for (const c of pick) {
    try {
      const { nodes, ents } = parseBatch(await tube('next', { continuation: c.replyToken }, cfg))
      for (const n of nodes) { const r = readComment(n, ents); if (r) out.push(r) }
    } catch {}
    await sleep(200)
  }
  return out
}

const likeNum = s => { const m = String(s || '').replace(/,/g, '').match(/([\d.]+)\s*([KkMm])?/); if (!m) return 0; return Math.round(Number(m[1]) * ({ k: 1e3, m: 1e6 }[(m[2] || '').toLowerCase()] || 1)) }

export async function collectYoutube(id, { isAm = () => false, pages = 3 } = {}) {
  const w = await getWatch(id)
  const vd = w.player?.videoDetails
  if (!vd) throw new Error(w.player?.playabilityStatus?.reason || 'Video YouTube nggak bisa dibuka (mungkin dibatasi atau diprivat)')
  const links = []
  const push = (url, kind, x = {}) => { const u = unwrapRedirect(url); if (u) links.push({ url: u, kind, ...x }) }
  extractLinks(vd.shortDescription || '').forEach(u => push(u, 'description'))
  for (const n of walk(w.data)) if (n.attributedDescription) urlsIn(n.attributedDescription).forEach(u => push(u, 'description'))

  const who = c => '@' + String(c.user).replace(/^@/, '')
  const addC = (c, tail = '') => [...extractLinks(c.text), ...c.urls].forEach(u => push(u, 'comment', { pinned: c.pinned, byAuthor: c.creator, digg: likeNum(c.likes), detail: who(c) + tail }))
  let comments = [], repliesScanned = 0
  const token = findCommentToken(w.data)
  if (token) {
    try { comments = await getComments(token, w.cfg, pages); comments.forEach(c => addC(c)) } catch {}
    if (comments.length && !links.some(l => isAm(l.url))) {
      const replies = await getReplies(comments, w.cfg)
      repliesScanned = replies.length
      replies.forEach(c => addC(c, ' (balasan)'))
    }
  }
  return {
    links, commentsScanned: comments.length, repliesScanned, embeddable: w.player?.playabilityStatus?.playableInEmbed !== false,
    title: vd.title, channel: vd.author, views: Number(vd.viewCount) || null, description: vd.shortDescription || '',
    published: w.player?.microformat?.playerMicroformatRenderer?.publishDate || null
  }
}
