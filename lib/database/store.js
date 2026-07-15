import { JSONFilePreset } from 'lowdb/node'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.resolve('./lib/database/data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const stores = new Map() // name -> Promise<entry>

function createStore(name, defaultData) {
  // Registers the in-flight promise synchronously (before the first await)
  // so concurrent callers requesting the same store name share one
  // JSONFilePreset instance instead of racing to create duplicates.
  if (stores.has(name)) return stores.get(name)

  const promise = (async () => {
    const file = path.join(DATA_DIR, `${name}.json`)
    const db = await JSONFilePreset(file, defaultData)

    const entry = {
      db,
      writeChain: Promise.resolve(),
      write() {
        // Chains every write through a single promise per store, so concurrent
        // callers can't interleave writes to the same file. lowdb's underlying
        // writer (steno) also writes to a temp file then renames, so a crash
        // mid-write never leaves a torn/corrupt JSON file on disk.
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
