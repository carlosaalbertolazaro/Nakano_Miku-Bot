// Wrapper de trace.moe (api.trace.moe) — identifica de qué anime es una
// escena a partir de una imagen. Verificado en vivo: la búsqueda por
// subida de imagen es POST con el buffer crudo en el body y
// Content-Type: image/jpeg (no multipart, no JSON) — confirmado contra la
// documentación real del proyecto (docs.md de soruly/trace.moe-api), no
// inventado. Sin API key: 100 búsquedas/día compartidas por IP.
const BASE = 'https://api.trace.moe'

export async function searchAnimeByImage(buffer) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  let res
  try {
    res = await fetch(`${BASE}/search?anilistInfo`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'image/jpeg' },
      body: buffer,
    })
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 413) throw new Error('La imagen es demasiado grande (máximo 25MB).')

  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error || `trace.moe respondió con estado ${res.status}`)
  if (json?.error) throw new Error(json.error)

  const best = json?.result?.[0]
  if (!best) throw new Error('No se encontró ninguna coincidencia para esa imagen.')

  return {
    similarity: best.similarity,
    episode: best.episode,
    from: best.from,
    to: best.to,
    previewImage: best.image,
    previewVideo: best.video,
    anilist: best.anilist,
    quota: json.quota,
    quotaUsed: json.quotaUsed,
  }
}

export function formatTimestamp(seconds) {
  if (seconds == null) return '?'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
