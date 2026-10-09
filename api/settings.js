let globalSettings = null
const defaults = {
  logo: '',
  modal: 'qris.png',
  wa: 'https://whatsapp.com/channel/0029VbDPWOjFMqrdmBdXu82R',
  tiktok: 'https://www.tiktok.com/@ancklo',
  bg: '',
  musicUrl: '',
  musicTitle: 'raaa music',
  musicArtist: 'Unknown artist',
  musicCover: ''
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method === 'GET') return res.status(200).json({ ...defaults, ...(globalSettings || {}) })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  globalSettings = {
    ...defaults,
    logo: typeof body.logo === 'string' ? body.logo : defaults.logo,
    modal: typeof body.modal === 'string' ? body.modal : defaults.modal,
    wa: typeof body.wa === 'string' ? body.wa : defaults.wa,
    tiktok: typeof body.tiktok === 'string' ? body.tiktok : defaults.tiktok,
    bg: typeof body.bg === 'string' ? body.bg : defaults.bg,
    musicUrl: typeof body.musicUrl === 'string' ? body.musicUrl : defaults.musicUrl,
    musicTitle: typeof body.musicTitle === 'string' ? body.musicTitle : defaults.musicTitle,
    musicArtist: typeof body.musicArtist === 'string' ? body.musicArtist : defaults.musicArtist,
    musicCover: typeof body.musicCover === 'string' ? body.musicCover : defaults.musicCover
  }
  return res.status(200).json(globalSettings)
}
