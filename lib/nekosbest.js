// Wrapper sobre nekos.best (nekos.best/api/v2), pública y gratuita, sin API
// key. Verificado en vivo: GET /api/v2/<endpoint> devuelve
// { results: [{ anime_name, url, dimensions }] }.

import { fetchJsonWithRetry } from './httpJson.js'

export async function fetchReactionGif(endpoint) {
  const json = await fetchJsonWithRetry(`https://nekos.best/api/v2/${endpoint}`, { retries: 1, timeoutMs: 8000 })
  const result = json?.results?.[0]
  if (!result?.url) throw new Error('nekos.best no devolvió ningún gif para esta acción.')
  return result
}

// El archivo .gif en sí también exige el mismo User-Agent que la API (lo
// confirmamos: un UA de navegador o vacío da 403 en el CDN también, no solo
// en el endpoint JSON). Si le pasamos {image: {url}} a Baileys, ES BAILEYS
// quien descarga la URL puertas adentro, con su propio User-Agent — no el
// nuestro — y eso vuelve a dar 403. Por eso bajamos el buffer acá, con
// nuestro header correcto, y mandamos el buffer ya descargado en vez de la URL.
export async function downloadReactionGifBuffer(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NakanoMikuBot (https://github.com/carlosaalbertolazaro/Nakano_Miku-Bot)' }
  })
  if (!res.ok) throw new Error(`No se pudo descargar el gif (estado ${res.status}).`)
  return Buffer.from(await res.arrayBuffer())
}
