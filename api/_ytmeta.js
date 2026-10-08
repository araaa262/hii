export async function getYtMeta(youtubeUrl) {
  try {
    const cheerio = await import('cheerio')
    const res = await fetch('https://tubepilot.ai/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Origin: 'https://tubepilot.ai',
        Referer: 'https://tubepilot.ai/tools/youtube-data-viewer/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: new URLSearchParams({ action: 'yt_data_viewer', yt_url: youtubeUrl }).toString(),
      signal: AbortSignal.timeout(12000)
    })
    if (!res.ok) return null
    const $ = cheerio.load(await res.text())

    const field = label => {
      let value = null
      $('b').each((i, el) => {
        if ($(el).text().trim().toLowerCase() === label.toLowerCase() + ':') {
          const nextNode = $(el)[0].nextSibling
          value = nextNode && nextNode.type === 'text' ? nextNode.data.trim() : $(el).next().text().trim()
        }
      })
      return value || null
    }
    const int = label => parseInt((field(label) || '').replace(/,/g, '')) || 0

    const title = field('Video Title')
    if (!title) return null
    const thumbnails = []
    $('.ytimg-item').each((i, el) => {
      const url = $(el).find('a').first().attr('href')
      if (url) thumbnails.push({ quality: $(el).find('span').first().text().replace('✦', '').trim(), url })
    })
    return {
      title,
      uploadedDate: field('Video Uploaded Date'),
      duration: field('Duration'),
      views: int('Views Count'),
      likes: int('Likes Count'),
      comments: int('Comments Count'),
      description: $('.ytdesc .ytdesc-txt').text().trim() || null,
      thumbnails,
      channel: { name: field('Channel Name'), id: field('Channel ID'), subs: field('Subscribers Count') }
    }
  } catch { return null }
}
