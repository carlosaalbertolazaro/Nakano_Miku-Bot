// One-off migration: old per-group JSON files (lib/database/data/groups/<id>.json)
// -> unified lowdb store (lib/database/data/groups.json).
// Safe to re-run (idempotent) — only fills in groups not already present in the new store.
// Run once: node scripts/migrate-groups.js

import fs from 'fs'
import path from 'path'
import GroupDb from '../lib/database/GroupDb.js'

const OLD_DIR = path.resolve('./lib/database/data/groups')

async function main() {
  if (!fs.existsSync(OLD_DIR)) {
    console.log('[migrate-groups] No hay carpeta lib/database/data/groups — nada que migrar.')
    return
  }

  const files = fs.readdirSync(OLD_DIR).filter(f => f.endsWith('.json'))
  if (files.length === 0) {
    console.log('[migrate-groups] Carpeta vacía — nada que migrar.')
    return
  }

  let migrated = 0
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(OLD_DIR, file), 'utf-8'))
      const id = raw.id
      if (!id) {
        console.warn(`[migrate-groups] Saltando ${file}: sin campo "id".`)
        continue
      }
      await GroupDb.updateOne(id, raw)
      migrated++
      console.log(`[migrate-groups] OK: ${id}`)
    } catch (e) {
      console.error(`[migrate-groups] Error migrando ${file}:`, e.message)
    }
  }

  console.log(`[migrate-groups] Listo. ${migrated}/${files.length} grupos migrados.`)
  console.log('[migrate-groups] Verificá lib/database/data/groups.json y luego podés borrar la carpeta vieja lib/database/data/groups/.')
}

main()
