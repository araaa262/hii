export default async function handler(req, res) {
  const raw = req.query?.url;
  if (!raw || typeof raw !== 'string') return res.status(400).send('Missing url');
  let target;
  try { target = new URL(raw); } catch { return res.status(400).send('Invalid url'); }
  if (!['http:', 'https:'].includes(target.protocol)) return res.status(400).send('Unsupported protocol');

  try {
    const headers = {};
    if (req.headers.range) headers.Range = req.headers.range;
    const upstream = await fetch(target, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(25000)
    });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).send(`Media upstream returned ${upstream.status}`);
    }

    const passthrough = [
      'content-type', 'content-length', 'content-range',
      'accept-ranges', 'etag', 'last-modified', 'cache-control'
    ];
    passthrough.forEach(name => {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    });
    if (!res.getHeader('content-type')) res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(upstream.status);

    if (!upstream.body) return res.end();
    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) res.status(502).send(`Media proxy error: ${err.message}`);
    else res.end();
  }
}
