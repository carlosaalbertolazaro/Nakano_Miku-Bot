// Wrapper mínimo sobre la API pública de Jikan (api.jikan.moe/v4), un espejo
// no oficial de MyAnimeList, sin API key. Se usa para el gacha de personajes
// de anime. Es un servicio comunitario gratuito y a veces inestable — todo
// llamado acá está pensado para fallar con un mensaje claro en vez de tirar
// abajo el comando.

import { fetchJsonWithRetry } from './httpJson.js'
import { createStore } from './database/store.js'

const BASE = 'https://api.jikan.moe/v4'
const POOL_SIZE = 200

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

// Cada personaje que Jikan devuelve con éxito se guarda en un pool local
// (FIFO, hasta POOL_SIZE) — si Jikan está caído (pasó varias veces en la
// práctica: 504, timeouts), .gacha/.waifu tira de acá en vez de fallar de
// una. Se llena solo con el uso normal del bot, no hace falta nada manual.
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
  try {
    const json = await jikanGet('/random/characters')
    const data = Array.isArray(json?.data) ? json.data[0] : json?.data
    if (!data || !data.name) throw new Error('Jikan devolvió una respuesta sin datos de personaje.')

    const image = data.images?.jpg?.image_url || data.images?.webp?.image_url || null
    const series = data.anime?.[0]?.anime?.title || data.manga?.[0]?.manga?.title || 'Serie desconocida'
    const favorites = Number(data.favorites) || 0

    const character = {
      malId: data.mal_id,
      name: data.name,
      series,
      image,
      favorites,
      rarity: calcRarity(favorites),
      url: data.url || null,
      fromCache: false,
    }

    if (character.image) addToPool(character).catch(() => {})
    return character
  } catch (e) {
    const fallback = await pickFromPool()
    if (fallback) return { ...fallback, fromCache: true }
    throw e
  }
}
