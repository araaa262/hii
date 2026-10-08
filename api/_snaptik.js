import { pickVideoUrl } from './_pick.js'

const BASE = 'https://snaptik.fi'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function download(url) {
  const res = await fetch(`${BASE}/api/tiktok`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA, Referer: `${BASE}/` },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(15000)
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data) throw new Error(data?.message || data?.error || `Request gagal (${res.status})`)
  return data
}

const https = u => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u.replace(/^http:/i, 'https:') : null)

export async function getTiktokFromSnaptik(url) {
  for (let i = 0; i < 2; i++) {
    try {
      const d = await download(url)
      const u = https(d.download_link?.no_watermark) || https(pickVideoUrl(d))
      if (u) return u
    } catch {}
  }
  return null
}
