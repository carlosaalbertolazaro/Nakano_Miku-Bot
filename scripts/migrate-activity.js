// One-off migration: old per-group activity JSON files (lib/database/data/activity/<groupId>.json,
// shape { [userJid]: messageCount }) -> unified per-user store (lib/database/data/users.json,
// user.activity[groupJid] = count).
// Safe to re-run (idempotent) — overwrites the matching activity counters with the values from disk.
// Run once: node scripts/migrate-activity.js

import fs from 'fs'
import path from 'path'
import UserDb from '../lib/database/UserDb.js'

const OLD_DIR = path.resolve('./lib/database/data/activity')

async function main() {
  if (!fs.existsSync(OLD_DIR)) {
    console.log('[migrate-activity] No hay carpeta lib/database/data/activity — nada que migrar.')
    return
  }

  const files = fs.readdirSync(OLD_DIR).filter(f => f.endsWith('.json'))
  if (files.length === 0) {
    console.log('[migrate-activity] Carpeta vacía — nada que migrar.')
    return
  }

  let migratedUsers = 0
  for (const file of files) {
    const groupId = file.replace(/\.json$/, '') + '@g.us'
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(OLD_DIR, file), 'utf-8'))
      for (const [userJid, count] of Object.entries(raw)) {
        const user = await UserDb.findOrCreate(userJid)
        user.activity[groupId] = count
        await user.save()
        migratedUsers++
      }
      console.log(`[migrate-activity] OK: ${groupId} (${Object.keys(raw).length} usuarios)`)
    } catch (e) {
      console.error(`[migrate-activity] Error migrando ${file}:`, e.message)
    }
  }

  console.log(`[migrate-activity] Listo. ${migratedUsers} entradas de actividad migradas.`)
  console.log('[migrate-activity] Verificá lib/database/data/users.json y luego podés borrar la carpeta vieja lib/database/data/activity/.')
}

main()
