// Wrapper mínimo sobre la API pública de Jikan (api.jikan.moe/v4), un espejo
// no oficial de MyAnimeList, sin API key. Es un servicio comunitario gratuito
// que en la práctica se cae seguido (confirmado: varios 504 reales durante
// las pruebas). fetchRandomCharacter() por eso encadena varias fuentes antes
// de rendirse: Jikan -> AniList (más estable) -> caché local de personajes
// ya vistos -> recién ahí error.

import { fetchJsonWithRetry } from './httpJson.js'
import { createStore } from './database/store.js'
import { RARITY_TIERS, calcRarity } from './animeRarity.js'
import { fetchRandomCharacterFromAniList } from './anilist.js'

export { RARITY_TIERS, calcRarity }

const BASE = 'https://api.jikan.moe/v4'
const POOL_SIZE = 200

async function fetchFromJikan() {
  const json = await fetchJsonWithRetry(`${BASE}/random/characters`, { retries: 1, timeoutMs: 8000 })
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

// Cada personaje que se consigue con éxito (de cualquier fuente) se guarda
// en un pool local (FIFO, hasta POOL_SIZE) para cuando AMBAS APIs estén
// caídas — .gacha/.waifu tira de acá en vez de fallar de una. Se llena solo
// con el uso normal del bot, no hace falta nada manual.
async function addToPool(character) {
  const store = await createStore('jikan-pool', { characters: [] })
  store.db.data.characters.push(character)
  if (store.db.data.characters.length > POOL_SIZE) store.db.data.characters.shift()
  store.writeDebounced()
}

async function pickFromPool() {
  const store = await createStore('jikan-pool', { characters: [] })
  const pool = store.db.data.characters
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

export async function fetchRandomCharacter() {
  let character = null
  let lastErr = null

  try {
    character = await fetchFromJikan()
  } catch (e) {
    lastErr = e
    try {
      character = await fetchRandomCharacterFromAniList()
    } catch (e2) {
      lastErr = e2
    }
  }

  if (character) {
    character.fromCache = false
    if (character.image) addToPool(character).catch(() => {})
    return character
  }

  const fallback = await pickFromPool()
  if (fallback) return { ...fallback, fromCache: true }

  throw lastErr || new Error('No se pudo consultar ninguna base de datos de anime.')
}
