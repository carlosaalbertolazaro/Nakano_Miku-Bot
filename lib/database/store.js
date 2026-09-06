import { JSONFilePreset } from 'lowdb/node'
import path from 'path'
import fs from 'fs'
import { getMongoDb } from './mongo.js'

const DATA_DIR = path.resolve('./lib/database/data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const stores = new Map() // name -> Promise<entry>

function createStore(name, defaultData) {
  // Registers the in-flight promise synchronously (before the first await)
  // so concurrent callers requesting the same store name share one
  // instance instead of racing to create duplicates.
  if (stores.has(name)) return stores.get(name)

  const promise = (async () => {
    let mongoDb = null
    try {
      mongoDb = await getMongoDb()
    } catch (e) {
      console.warn(`[DB:${name}] No se pudo conectar a MongoDB, usando almacenamiento local:`, e.message)
    }

    if (mongoDb) {
      const col = mongoDb.collection('bot_stores')
      const doc = await col.findOne({ _id: name })
      let data = defaultData
      if (doc && doc.data) {
        try {
          data = JSON.parse(doc.data)
        } catch {
          data = doc.data
        }
      }

      const entry = {
        db: { data },
        writeChain: Promise.resolve(),
        write() {
          entry.writeChain = entry.writeChain
            .then(async () => {
              await col.updateOne(
                { _id: name },
                { $set: { data: JSON.stringify(entry.db.data) } },
                { upsert: true }
              )
            })
            .catch(e => console.error(`[DB:MONGO:${name}] write error:`, e.message))
          return entry.writeChain
        },
        writeDebounced() {
          if (entry._timer) return
          entry._timer = setTimeout(() => {
            entry._timer = null
            entry.write()
          }, 3000)
        },
        _timer: null,
      }
      return entry
    }

    // Modo local estándar con archivos JSON
    const file = path.join(DATA_DIR, `${name}.json`)
    const db = await JSONFilePreset(file, defaultData)

    const entry = {
      db,
      writeChain: Promise.resolve(),
      write() {
        entry.writeChain = entry.writeChain
          .then(() => db.write())
          .catch(e => console.error(`[DB:${name}] write error:`, e.message))
        return entry.writeChain
      },
      writeDebounced() {
        if (entry._timer) return
        entry._timer = setTimeout(() => {
          entry._timer = null
          entry.write()
        }, 3000)
      },
      _timer: null,
    }

    return entry
  })()

  stores.set(name, promise)
  return promise
}

export { createStore }
