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
  }
}

export default GroupDb
