# AM Preset Finder

Deploy ke Vercel: import repository atau jalankan `vercel --prod`.

- `public/index.html` — frontend website.
- `api/find.js` — pemindaian link video.
- `api/search.js` — endpoint pencarian kata kunci (`/api/search?q=...`).
- `api/_amfinder.js` — modul scraper pencarian kata kunci dengan ES Modules, mengikuti pola file API lainnya.
- `api/_*.js` — helper scraper.

Pencarian kata kunci berjalan langsung dari fungsi API; tidak memakai file `.cjs`, `child_process`, atau terminal di website.

Contoh: `GET /api/search?q=preset%20jedag%20jedug`

Pencarian memindai hingga 3 video teratas. Ketersediaan tetap mengikuti API dan proteksi situs `amfinder.web.id`.

Node.js 20+; jalankan `npm install` sebelum deploy.


Pemutaran video:
- `api/_snaptik.js` meminta URL MP4 dari endpoint downloader Snaptik untuk tautan TikTok.
- `api/video.js` mem-proxy stream MP4 ke browser agar pemutar dapat meminta byte-range.
- `public/watch.html` mencoba stream melalui `/api/video` terlebih dahulu dan beralih ke URL sumber jika proxy gagal.
- URL MP4 pihak ketiga dapat kedaluwarsa atau berubah sewaktu-waktu; pemutaran bergantung pada ketersediaan penyedia.
