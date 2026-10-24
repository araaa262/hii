import { keywordSearch } from './_amfinder.js'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Gunakan metode GET.' })
  }
  const q = String(req.query?.q || '').trim()
  if (q.length < 3) return res.status(400).json({ ok: false, error: 'Kata kunci minimal 3 karakter.' })
  if (q.length > 180) return res.status(400).json({ ok: false, error: 'Kata kunci terlalu panjang.' })
  try {
    const data = await keywordSearch(q, 3, 500)
    data.ok = true
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(data)
  } catch (err) {
    const status = err?.status === 429 ? 429 : 502
    return res.status(status).json({ ok: false, error: err?.message || 'Pencarian kata kunci gagal. Coba lagi nanti.' })
  }
}
