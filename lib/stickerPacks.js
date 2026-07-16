// Sistema de packs de stickers guardados: los stickers (webp) se guardan en
// disco (no en el JSON de lowdb — meter binarios en base64 ahí infla el
// archivo y obliga a lowdb a cargar todo en RAM en cada escritura, un
// problema real en un teléfono). El store solo guarda metadata liviana
// (nombre del pack y las rutas de archivo).
import { createStore } from './database/store.js'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const FILES_DIR = path.resolve('./lib/database/data/stickerpacks')
if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true })

const storePromise = createStore('stickerpacks', { owners: {} })

function sanitize(name) {
  return (name || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30)
}

function ownerDir(ownerJid) {
  return path.join(FILES_DIR, sanitize(ownerJid.split('@')[0]))
}

export async function listPacks(ownerJid) {
  const store = await storePromise
  const owner = store.db.data.owners[ownerJid]
  if (!owner) return []
  return Object.entries(owner.packs).map(([key, p]) => ({ key, displayName: p.displayName, count: p.files.length }))
}

export async function getPack(ownerJid, name) {
  const store = await storePromise
  const key = sanitize(name)
  return store.db.data.owners[ownerJid]?.packs?.[key] || null
}

export async function createPack(ownerJid, name) {
  const key = sanitize(name)
  if (!key) throw new Error('Nombre de pack inválido (usá letras, números, guiones).')

  const store = await storePromise
  if (!store.db.data.owners[ownerJid]) store.db.data.owners[ownerJid] = { packs: {} }
  if (store.db.data.owners[ownerJid].packs[key]) throw new Error('Ya tenés un pack con ese nombre.')

  store.db.data.owners[ownerJid].packs[key] = { displayName: name.trim(), files: [] }
  await store.write()
  return key
}

export async function deletePack(ownerJid, name) {
  const key = sanitize(name)
  const store = await storePromise
  const pack = store.db.data.owners[ownerJid]?.packs?.[key]
  if (!pack) throw new Error('No tenés ningún pack con ese nombre.')

  for (const file of pack.files) {
    fs.promises.unlink(file).catch(() => {})
  }
  delete store.db.data.owners[ownerJid].packs[key]
  await store.write()
}

export async function addStickerToPack(ownerJid, name, buffer) {
  const key = sanitize(name)
  const store = await storePromise
  const pack = store.db.data.owners[ownerJid]?.packs?.[key]
  if (!pack) throw new Error('No tenés ningún pack con ese nombre. Creá uno con .newpack primero.')

  const dir = ownerDir(ownerJid)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `${uuidv4()}.webp`)
  await fs.promises.writeFile(filePath, buffer)

  pack.files.push(filePath)
  await store.write()
  return pack.files.length
}
