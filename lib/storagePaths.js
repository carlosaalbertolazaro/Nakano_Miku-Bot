import path from 'path'

// En Railway, el volumen es el único almacenamiento que sobrevive a los
// redespliegues. Fuera de Railway se conservan las rutas originales del bot.
const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim()

export const SESSION_PATH = volumePath
  ? path.join(volumePath, 'sessions', 'main')
  : path.resolve('./sessions/main')

export const DATABASE_DIR = volumePath
  ? path.join(volumePath, 'database')
  : path.resolve('./lib/database/data')
