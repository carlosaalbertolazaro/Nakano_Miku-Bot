import { createStore } from './store.js'

// Store GLOBAL (no es por-grupo, a diferencia de GroupDb) para los "canales"
// temáticos de conectividad entre grupos: un tag (ej. "anime") tiene una
// lista de grupos suscritos, y un mensaje enviado a ese tag se reenvía a
// todos los demás grupos suscritos. Vive en su propio archivo
// (lib/database/data/tags.json) vía el mismo helper createStore que ya usan
// GroupDb/UserDb (escritura serializada + atómica).
const storePromise = createStore('tags', { tags: {} })

const TagDb = {
  async listTags() {
    const store = await storePromise
    return Object.entries(store.db.data.tags).map(([name, t]) => ({ name, groupCount: t.groups.length }))
  },
  async getSubscribedGroups(tagName) {
    const store = await storePromise
    return store.db.data.tags[tagName]?.groups || []
  },
  async getGroupTags(groupJid) {
    const store = await storePromise
    return Object.entries(store.db.data.tags)
      .filter(([, t]) => t.groups.includes(groupJid))
      .map(([name]) => name)
  },
  async subscribe(groupJid, tagName) {
    const store = await storePromise
    if (!store.db.data.tags[tagName]) store.db.data.tags[tagName] = { groups: [] }
    const tag = store.db.data.tags[tagName]
    if (tag.groups.includes(groupJid)) return false
    tag.groups.push(groupJid)
    await store.write()
    return true
  },
  async unsubscribe(groupJid, tagName) {
    const store = await storePromise
    const tag = store.db.data.tags[tagName]
    if (!tag) return false
    const idx = tag.groups.indexOf(groupJid)
    if (idx === -1) return false
    tag.groups.splice(idx, 1)
    await store.write()
    return true
  },
}

export default TagDb
