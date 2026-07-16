import { createStore } from './store.js'
import { userDbCache } from '../caches.js'

const defaults = {
  jid: null,
  name: '',
  xp: 0,
  level: 1,
  coins: 0,
  premium: { tier: 'free', expiresAt: null },
  activity: {},   // { [groupJid]: messageCount }
  data: {},       // free-form bag for future modules, namespaced by module key (data.waifu, data.games, ...)
  createdAt: null,
  updatedAt: null,
}

const storePromise = createStore('users', { users: {} })

function wrap(jid, store) {
  return {
    ...store.db.data.users[jid],
    jid,
    async save() {
      const plain = { ...this }
      delete plain.save
      delete plain.jid
      plain.updatedAt = Date.now()
      store.db.data.users[jid] = plain
      await store.write()
    }
  }
}

const UserDb = {
  async findOrCreate(jid) {
    const cached = userDbCache.get(jid)
    if (cached) return cached

    const store = await storePromise
    if (!store.db.data.users[jid]) {
      const now = Date.now()
      store.db.data.users[jid] = { ...structuredClone(defaults), jid, createdAt: now, updatedAt: now }
      await store.write()
    }

    const doc = wrap(jid, store)
    userDbCache.set(jid, doc)
    return doc
  },
  async updateOne(jid, update) {
    const doc = await UserDb.findOrCreate(jid)
    Object.assign(doc, update)
    await doc.save()
    return doc
  }
}

export async function incrementActivity(jid, groupJid) {
  const store = await storePromise
  if (!store.db.data.users[jid]) {
    const now = Date.now()
    store.db.data.users[jid] = { ...structuredClone(defaults), jid, createdAt: now, updatedAt: now }
  }
  const user = store.db.data.users[jid]
  user.activity[groupJid] = (user.activity[groupJid] || 0) + 1
  userDbCache.del(jid) // force a fresh read next findOrCreate, avoiding a stale cached copy
  store.writeDebounced()
}

export async function getGroupLeaderboard(groupJid, { limit = 20, order = 'desc' } = {}) {
  const store = await storePromise
  const entries = Object.values(store.db.data.users)
    .filter(u => (u.activity[groupJid] || 0) > 0)
    .map(u => ({ jid: u.jid, count: u.activity[groupJid] }))
    .sort((a, b) => order === 'desc' ? b.count - a.count : a.count - b.count)
    .slice(0, limit)
  return entries
}

// Ranks a given set of jids (typically a group's participant list) by XP.
// XP is stored per-user (global, not per-group), so unlike activity there's
// no per-group counter to read — participants with no record yet are treated
// as xp 0 without creating a record for them just to compute a ranking.
export async function getXpRanking(jids) {
  const store = await storePromise
  const set = new Set(jids)
  const xpByJid = new Map(
    Object.values(store.db.data.users)
      .filter(u => set.has(u.jid))
      .map(u => [u.jid, u.xp])
  )
  return [...set]
    .map(jid => ({ jid, xp: xpByJid.get(jid) || 0 }))
    .sort((a, b) => b.xp - a.xp)
}

// Same idea as getXpRanking but for an arbitrary numeric field (e.g. 'coins'),
// used by the leaderboard command so .topxp / .topcoins share one code path.
export async function getRanking(jids, field, { limit = 10 } = {}) {
  const store = await storePromise
  const set = new Set(jids)
  const valueByJid = new Map(
    Object.values(store.db.data.users)
      .filter(u => set.has(u.jid))
      .map(u => [u.jid, u[field] || 0])
  )
  return [...set]
    .map(jid => ({ jid, value: valueByJid.get(jid) || 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// Cumpleaños guardados en user.data.profile.birthday como "MM-DD" (sin año,
// no hace falta la edad para esto). Se usa para .birthdays/.allbirthdays,
// cruzando contra la lista de participantes del grupo que llama.
export async function getBirthdays(jids) {
  const store = await storePromise
  const set = new Set(jids)
  return Object.values(store.db.data.users)
    .filter(u => set.has(u.jid) && u.data?.profile?.birthday)
    .map(u => ({ jid: u.jid, birthday: u.data.profile.birthday }))
}

export async function getActivityMap(groupJid) {
  const store = await storePromise
  const map = {}
  for (const user of Object.values(store.db.data.users)) {
    const count = user.activity[groupJid]
    if (count) map[user.jid] = count
  }
  return map
}

export async function resetGroupActivity(groupJid) {
  const store = await storePromise
  for (const user of Object.values(store.db.data.users)) {
    delete user.activity[groupJid]
  }
  userDbCache.flushAll()
  await store.write()
}

export default UserDb
