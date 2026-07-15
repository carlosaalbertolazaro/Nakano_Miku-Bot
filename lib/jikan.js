// Wrapper mínimo sobre la API pública de Jikan (api.jikan.moe/v4), un espejo
// no oficial de MyAnimeList, sin API key. Se usa para el gacha de personajes
// de anime. Es un servicio comunitario gratuito y a veces inestable — todo
// llamado acá está pensado para fallar con un mensaje claro en vez de tirar
// abajo el comando.

import { fetchJsonWithRetry } from './httpJson.js'

const BASE = 'https://api.jikan.moe/v4'

function jikanGet(path, opts) {
  return fetchJsonWithRetry(`${BASE}${path}`, opts)
}

// Única fuente de verdad para las rarezas: el rango de favoritos define el
// tier, y ese mismo tier define label y valor de reventa (.sellwaifu lee esto
// por clave, ya que solo persiste rarity.key en el inventario del usuario).
export const RARITY_TIERS = {
  legendaria: { label: '🌈 Legendaria', minFavorites: 10000, sellValue: 400 },
  epica:      { label: '💜 Épica',      minFavorites: 3000,  sellValue: 150 },
  rara:       { label: '💙 Rara',       minFavorites: 800,   sellValue: 60 },
  comun:      { label: '🤍 Común',      minFavorites: 0,     sellValue: 20 },
}

export function calcRarity(favorites = 0) {
  for (const key of ['legendaria', 'epica', 'rara', 'comun']) {
    if (favorites >= RARITY_TIERS[key].minFavorites) {
      return { key, ...RARITY_TIERS[key] }
    }
  }
}

export async function fetchRandomCharacter() {
  const json = await jikanGet('/random/characters')
  const data = Array.isArray(json?.data) ? json.data[0] : json?.data
  if (!data || !data.name) throw new Error('Jikan devolvió una respuesta sin datos de personaje.')

  const image = data.images?.jpg?.image_url || data.images?.webp?.image_url || null
  const series = data.anime?.[0]?.anime?.title || data.manga?.[0]?.manga?.title || 'Serie desconocida'
  const favorites = Number(data.favorites) || 0

  return {
    malId: data.mal_id,
    name: data.name,
    series,
    image,
    favorites,
    rarity: calcRarity(favorites),
    url: data.url || null,
  }
}
