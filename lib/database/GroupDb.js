import { createStore } from './store.js'
import { groupDbCache } from '../caches.js'

const defaults = {
  welcome: false,
  goodbye: false,
  antidelete: false,
  antilink: false,
  nsfw: false,
  onlyadmin: false,
  disabledCmds: [],
  disabledCategories: [],
  warns: {},
  warnLimit: 3,
  // Toggles rápidos para las actividades "vivas" (spawns/gacha), pensados
  // para poder armar grupos de una sola actividad. Todo chequeo en el código
  // usa `=== false` (nunca `!== true`) para que grupos ya existentes, cuyo
  // JSON guardado no tiene este campo todavía, sigan con todo activado por
  // defecto sin necesitar una migración.
  modules: { waifu: true, pokemon: true, cards: true },
  verifyEnabled: false, // anti-raid, opt-in a propósito (no sorprende a grupos ya existentes)
  confesionCount: 0,
  events: [], // { id, title, timestamp, createdBy, attendees:[], reminded, done }
  aiConstantMode: false, // .iamodo — si está en true, Miku responde casi todos los mensajes del grupo (no solo de vez en cuando)
  followedAnime: [], // .airing — { id (AniList), title, lastKnownEpisode, addedBy }
}

const storePromise = createStore('groups', { groups: {} })

function wrap(id, store) {
  return {
    ...store.db.data.groups[id],
    id,
    async save() {
      const plain = { ...this }
      delete plain.save
      delete plain.id
      store.db.data.groups[id] = plain
      await store.write()
    }
  }
}

const GroupDb = {
  async findOrCreate(id) {
    const cached = groupDbCache.get(id)
    if (cached) return cached

    const store = await storePromise
    if (!store.db.data.groups[id]) {
      store.db.data.groups[id] = structuredClone(defaults)
      await store.write()
    }

    const doc = wrap(id, store)
    groupDbCache.set(id, doc)
    return doc
  },
  async updateOne(id, update) {
    const doc = await GroupDb.findOrCreate(id)
    Object.assign(doc, update)
    await doc.save()
    return doc
  },
  // Usado por lib/eventScheduler.js para recorrer los eventos de TODOS los
  // grupos en cada chequeo periódico, sin depender de que cada grupo esté
  // en el cache (a diferencia de findOrCreate, esto no cachea).
  async getAll() {
    const store = await storePromise
    return Object.keys(store.db.data.groups).map(id => wrap(id, store))
  }
}

export default GroupDb
