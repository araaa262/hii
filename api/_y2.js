const CNV = 'https://cnv.cx/v2'
const FRAME = 'https://frame.y2meta-uk.com'
const H = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', Referer: FRAME + '/', Origin: FRAME }

export async function getYtMp4(id) {
  try {
    const k = await (await fetch(`${CNV}/sanity/key?id=${id}`, { headers: H, signal: AbortSignal.timeout(10000) })).json()
    if (!k?.key) return null
    for (const q of [360, 240, 720, 144]) {
      try {
        const r = await fetch(`${CNV}/converter`, {
          method: 'POST',
          headers: { ...H, 'Content-Type': 'application/x-www-form-urlencoded', accept: '*/*', key: k.key },
          body: new URLSearchParams({ link: `https://youtu.be/${id}`, format: 'mp4', audioBitrate: '128', videoQuality: String(q), filenameStyle: 'pretty', vCodec: 'h264' }).toString(),
          signal: AbortSignal.timeout(20000)
        })
        const j = await r.json().catch(() => null)
        if (j?.url && /^https:\/\//i.test(j.url)) return j.url
      } catch {}
    }
  } catch {}
  return null
}
