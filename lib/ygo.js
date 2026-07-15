// Wrapper sobre YGOPRODeck (db.ygoprodeck.com/api/v7), pública y gratuita,
// sin API key. Verificado en vivo: randomcard.php redirige (301) a
// cardinfo.php?...&sort=random y devuelve { data: [ {...una carta...} ] }.
// fetch() sigue redirects por defecto, así que no hace falta manejarlo.

import { fetchJsonWithRetry } from './httpJson.js'

const RANDOM_CARD_URL = 'https://db.ygoprodeck.com/api/v7/randomcard.php'

// Único lugar con los valores de rareza — mapeamos las rarezas REALES del
// TCG (viene de card_sets[].set_rarity, con decenas de variantes como
// "Ultra Rare", "Ghost Rare", "Starlight Rare") a 4 categorías propias.
export const CARD_RARITY_TIERS = {
  ultrarrara: { label: '✨ Ultra Rara', sellValue: 500 },
  superrara:  { label: '💎 Super Rara', sellValue: 180 },
  rara:       { label: '🔷 Rara',       sellValue: 70 },
  comun:      { label: '⬜ Común',      sellValue: 25 },
}

function mapSetRarity(setRarity = '') {
  const s = String(setRarity).toLowerCase()
  if (/(ultra|secret|ultimate|ghost|starlight|collector|gold)/.test(s)) return 'ultrarrara'
  if (/super/.test(s)) return 'superrara'
  if (/rare/.test(s)) return 'rara'
  return 'comun'
}

export async function fetchRandomCard() {
  const json = await fetchJsonWithRetry(RANDOM_CARD_URL)
  const data = Array.isArray(json?.data) ? json.data[0] : json?.data
  if (!data || !data.name) throw new Error('YGOPRODeck devolvió una respuesta sin datos de carta.')

  const image = data.card_images?.[0]?.image_url || null
  const rarityKey = mapSetRarity(data.card_sets?.[0]?.set_rarity)

  return {
    id: data.id,
    name: data.name,
    type: data.type || 'Desconocido',
    race: data.race || null,
    attribute: data.attribute || null,
    atk: typeof data.atk === 'number' ? data.atk : null,
    def: typeof data.def === 'number' ? data.def : null,
    level: data.level || null,
    desc: data.desc || '',
    image,
    rarity: { key: rarityKey, ...CARD_RARITY_TIERS[rarityKey] },
    url: data.ygoprodeck_url || null,
  }
}
