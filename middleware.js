const SECRET = process.env.GUARD_SECRET || ''
const BOT_KEY = process.env.BOT_KEY || ''
const COOKIE = 'am_c'
const TTL = 12 * 60 * 60

// Cheap first-pass filtering. Real bot protection should also be enabled in
// Vercel Firewall (Bot Protection + rate limiting).
const BAD_UA = /(httrack|wget|curl|python|requests|scrapy|aiohttp|go-http|libwww|okhttp|axios|node-fetch|undici|saveweb|webcopier|teleport|offline|downloader|sitesucker|webzip|headless|phantom|puppeteer|selenium)/i
const GOOD_BOT = /(googlebot|bingbot|duckduckbot|facebookexternalhit|twitterbot|whatsapp|telegrambot|discordbot)/i

export const config = {
  matcher: '/((?!_vercel|favicon.ico).*)',
}

const NEXT = () => new Response(null, { headers: { 'x-middleware-next': '1' } })
const deny = (message = '403 Forbidden') => new Response(message, {
  status: 403,
  headers: {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate',
    'x-content-type-options': 'nosniff',
  },
})

const enc = new TextEncoder()
let keyP
const key = () => {
  // If the env var is missing, do not expose a predictable shared secret.
  // The deployment should define GUARD_SECRET in Vercel Environment Variables.
  const secret = SECRET || 'missing-guard-secret'
  return (keyP ||= crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']))
}
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
const sign = async value => hex(await crypto.subtle.sign('HMAC', await key(), enc.encode(String(value))))

async function hasValidCookie(cookie) {
  const m = cookie.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=(\\d+)\\.([a-f0-9]{64})'))
  if (!m) return false
  const age = Math.floor(Date.now() / 1000) - Number(m[1])
  if (age < 0 || age > TTL) return false
  return (await sign(m[1])) === m[2]
}

async function challenge() {
  if (!SECRET) return deny('Anti-bot belum dikonfigurasi: set GUARD_SECRET di Vercel.')
  const ts = Math.floor(Date.now() / 1000)
  const tok = `${ts}.${await sign(ts)}`
  const safeTok = tok.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const html = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Checking browser…</title>
<body style="margin:0;background:#0B0B0C;color:#f5f5f4;font:14px system-ui;display:grid;place-items:center;min-height:100vh">
<div style="text-align:center"><b>Checking browser…</b><div style="opacity:.65;margin-top:8px">Please wait</div></div>
<script>
(async()=>{
  try {
    const token='${safeTok}';
    document.cookie='${COOKIE}='+token+';path=/;max-age=${TTL};samesite=lax'+(location.protocol==='https:'?';secure':'');
    // Require normal browser capabilities before returning to the site.
    const ok=!!(window.fetch&&window.crypto&&window.crypto.subtle&&navigator.cookieEnabled&&!navigator.webdriver);
    if(!ok) throw new Error('browser check failed');
    location.replace(location.href);
  } catch(e) {
    document.body.innerHTML='<div style="text-align:center"><b>Browser check failed</b><div style="opacity:.65;margin-top:8px">Enable JavaScript and cookies.</div></div>';
  }
})();
</script>`
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      'x-robots-tag': 'noindex, nofollow',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin',
    },
  })
}

export default async function middleware(req) {
  const h = req.headers
  const ua = h.get('user-agent') || ''
  const url = new URL(req.url)
  const path = url.pathname
  const isApi = path.startsWith('/api/')
  const accept = h.get('accept') || ''

  // Optional private bypass for your own trusted server-to-server calls.
  if (BOT_KEY && h.get('x-am-key') === BOT_KEY) return NEXT()

  // Never allow known automation clients to call the API just because their
  // user-agent is present. APIs require the signed browser cookie.
  if (!ua || BAD_UA.test(ua)) return deny('Bot traffic blocked')

  // Let common verified crawlers see HTML, but never grant them API access.
  if (!isApi && GOOD_BOT.test(ua)) return NEXT()

  if (await hasValidCookie(h.get('cookie') || '')) return NEXT()

  // Browser HTML gets a one-time JS/cookie check. Everything else is denied.
  if (!isApi && req.method === 'GET' && accept.includes('text/html')) return challenge()

  return deny('Verification required')
}
