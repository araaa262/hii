const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
const DOC_ID = '27128499623469141'

export const igShortcode = u => String(u).match(/\/(?:p|reels?|tv)\/([A-Za-z0-9_-]+)/)?.[1] || null

export async function resolveIgShare(url) {
  if (!/instagram\.com\/share\//i.test(url)) return url
  try {
    const r = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) })
    const loc = r.headers.get('location')
    if (loc) return new URL(loc, url).href
  } catch {}
  return url
}

export async function getIgPost(shortcode) {
  try {
    const home = await fetch('https://www.instagram.com/', {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.8' },
      signal: AbortSignal.timeout(10000)
    })
    const raw = typeof home.headers.getSetCookie === 'function' ? home.headers.getSetCookie() : []
    const cookie = raw.map(c => c.split(';')[0]).join('; ')
    const csrf = cookie.match(/csrftoken=([^;]+)/)?.[1] || ''

    const r = await fetch('https://www.instagram.com/graphql/query', {
      method: 'POST',
      headers: {
        'User-Agent': UA, Accept: '*/*', 'Accept-Language': 'en-US,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': csrf, 'X-IG-App-ID': '936619743392459', Cookie: cookie,
        Referer: `https://www.instagram.com/p/${shortcode}/`
      },
      body: new URLSearchParams({
        variables: JSON.stringify({ shortcode, __relay_internal__pv__PolarisAIGMMediaWebLabelEnabledrelayprovider: false }),
        doc_id: DOC_ID,
        server_timestamps: 'true'
      }).toString(),
      signal: AbortSignal.timeout(15000)
    })
    const j = await r.json()
    const item = j?.data?.xdt_api__v1__media__shortcode__web_info?.items?.[0]
    if (!item) return null
    return {
      caption: item.caption?.text || '',
      user: item.user?.username || '',
      cover: item.image_versions2?.candidates?.[0]?.url || null
    }
  } catch { return null }
}
