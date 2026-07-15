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
