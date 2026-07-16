// Mercado global de personajes (a diferencia de .sellwaifu, que vende
// instantáneo al bot como sumidero de economía, esto es jugador-a-jugador:
// listás un precio, cualquiera lo puede comprar). Store global, no por
// grupo — mismo patrón que lib/database/TagDb.js.
import { createStore } from './database/store.js'

const storePromise = createStore('waifu_market', { listings: [], nextId: 1 })

export async function createListing(sellerJid, character, price) {
  const store = await storePromise
  const id = store.db.data.nextId++
  store.db.data.listings.push({ id, sellerJid, character, price, listedAt: Date.now() })
  await store.write()
  return id
}

export async function getListings({ page = 1, pageSize = 10 } = {}) {
  const store = await storePromise
  const all = store.db.data.listings
  const start = (page - 1) * pageSize
  return {
    total: all.length,
    totalPages: Math.max(1, Math.ceil(all.length / pageSize)),
    items: all.slice(start, start + pageSize),
  }
}

export async function getListing(id) {
  const store = await storePromise
  return store.db.data.listings.find(l => l.id === id) || null
}

export async function removeListing(id) {
  const store = await storePromise
  const idx = store.db.data.listings.findIndex(l => l.id === id)
  if (idx === -1) return null
  const [listing] = store.db.data.listings.splice(idx, 1)
  await store.write()
  return listing
}
