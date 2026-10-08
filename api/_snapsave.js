const BASE = 'https://snapsave.app'
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36'
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/'

function toBase(d, e, f) {
  const from = ALPHABET.slice(0, e).split('')
  const to = ALPHABET.slice(0, f).split('')
  let j = d.split('').reverse().reduce((a, b, c) => {
    const idx = from.indexOf(b)
    return idx !== -1 ? a + idx * Math.pow(e, c) : a
  }, 0)
  let k = ''
  while (j > 0) {
    k = to[j % f] + k
    j = (j - (j % f)) / f
  }
  return parseInt(k || '0', 10)
}

function unpack(js) {
  const m = js.match(/\(\s*"([^"]*)"\s*,\s*(\d+)\s*,\s*"([^"]*)"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (!m) return null
  const h = m[1]
  const n = m[3]
  const t = parseInt(m[4])
  const e = parseInt(m[5])
  let r = ''
  for (let i = 0; i < h.length; i++) {
    let s = ''
    while (i < h.length && h[i] !== n[e]) { s += h[i]; i++ }
    for (let j = 0; j < n.length; j++) s = s.replace(new RegExp(n[j], 'g'), String(j))
    r += String.fromCharCode(toBase(s, e, 10) - t)
  }
  return Buffer.from(r, 'latin1').toString('utf8')
}

async function getScript(url) {
  const form = new FormData()
  form.append('url', url)
  const res = await fetch(`${BASE}/action.php?lang=id`, {
    method: 'POST',
    headers: { 'User-Agent': UA, Origin: BASE, Referer: `${BASE}/id/download-video-instagram` },
    body: form,
    signal: AbortSignal.timeout(20000)
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`snapsave ${res.status}`)
  let js = text
  for (let i = 0; i < 3 && /function\s*\(h,u,n,t,e,r\)/.test(js); i++) {
    const out = unpack(js)
    if (!out) break
    js = out
  }
  return js
}

function extractHtml(js) {
  const patterns = [
    /getElementById\("download-section"\)\.innerHTML\s*=\s*"((?:\\.|[^"\\])*)"/,
    /innerHTML\s*=\s*"((?:\\.|[^"\\])*)"/
  ]
  for (const p of patterns) {
    const m = js.match(p)
    if (m) {
      try { return JSON.parse(`"${m[1]}"`) } catch { return m[1].replace(/\\(.)/g, '$1') }
    }
  }
  return null
}

const abs = u => (u.startsWith('http') ? u : BASE + (u.startsWith('/') ? '' : '/') + u)

async function parse(html) {
  const { load } = await import('cheerio')
  const $ = load(html)
  const items = []
  const seen = new Set()
  const push = (a, thumb) => {
    const $a = $(a)
    const onclick = $a.attr('onclick') || ''
    const viaRender = onclick.match(/get_progressApi\('([^']+)'\)/)
    const link = viaRender ? viaRender[1] : $a.attr('href')
    if (!link || link.startsWith('#') || link.startsWith('javascript')) return
    const url = abs(link)
    if (seen.has(url)) return
    seen.add(url)
    const label = $a.text().replace(/\s+/g, ' ').trim()
    const isImage = /\.(jpe?g|png|webp)(\?|$)/i.test(url) || /foto|photo|image|gambar/i.test(label)
    items.push({ type: isImage ? 'image' : 'video', quality: label || null, thumbnail: thumb || null, url })
  }
  const blocks = $('.download-items')
  if (blocks.length) {
    blocks.each((_, el) => {
      const thumb = $(el).find('img').first().attr('src')
      $(el).find('a').each((__, a) => push(a, thumb))
    })
  } else {
    $('a').each((_, a) => push(a, null))
  }
  return items
}

async function resolveRender(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: BASE }, signal: AbortSignal.timeout(10000) })
  const j = await r.json()
  if (!j.task_id) throw new Error('task_id tidak ada')
  for (let i = 0; i < 9; i++) {
    const t = await fetch(`${BASE}/task.php?token=${j.task_id}`, { headers: { 'User-Agent': UA, Referer: BASE }, signal: AbortSignal.timeout(8000) })
    const obj = await t.json()
    if (obj.status === -1) throw new Error('Render gagal')
    if (obj.progress === 100 && obj.download_url) return obj.download_url
    await new Promise(r => setTimeout(r, 2500))
  }
  throw new Error('Render timeout')
}

export async function snapsave(url) {
  const js = await getScript(url)
  const html = extractHtml(js)
  if (!html) throw new Error('HTML hasil ga ketemu')
  const results = await parse(html)
  if (!results.length) throw new Error('Link download ga ketemu')
  return results
}

export async function getInstagramFromSnapsave(url) {
  try {
    const results = await snapsave(url)
    const videos = results.filter(x => x.type === 'video')
    const images = results.filter(x => x.type === 'image')
    let vid = videos.find(x => !/render\.php/.test(x.url))?.url || null
    if (!vid) {
      const r = videos.find(x => /render\.php/.test(x.url))
      if (r) { try { vid = await resolveRender(r.url) } catch {} }
    }
    const cover = results.find(x => x.thumbnail)?.thumbnail || images[0]?.url || null
    return {
      url: vid,
      cover,
      caption: '',
      kind: !vid && images.length ? 'image' : 'video',
      count: images.length
    }
  } catch { return null }
}
