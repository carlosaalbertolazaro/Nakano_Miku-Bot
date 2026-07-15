import { fetchJsonWithRetry } from './httpJson.js'

// FreeToGame API (freetogame.com/api) — catálogo de juegos free-to-play,
// pública y sin API key. Verificado en vivo: platform=all trae PC+browser,
// category=<genero> filtra (ej. mmorpg, shooter, moba, battle-royale).
const BASE = 'https://www.freetogame.com/api'

export async function fetchFreeGames({ category = null, platform = 'all' } = {}) {
  const params = new URLSearchParams({ platform, 'sort-by': 'popularity' })
  if (category) params.set('category', category)

  const games = await fetchJsonWithRetry(`${BASE}/games?${params}`)
  if (!Array.isArray(games) || !games.length) {
    throw new Error('No se encontraron juegos gratuitos para ese filtro.')
  }
  return games
}
