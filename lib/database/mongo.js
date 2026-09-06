import { MongoClient } from 'mongodb'

let client = null
let db = null

/**
 * Retorna la instancia de base de datos de MongoDB si MONGODB_URI está configurado.
 * Si no está configurado, retorna null (modo local tradicional).
 */
export async function getMongoDb() {
  const uri = process.env.MONGODB_URI
  if (!uri) return null

  if (!client) {
    try {
      client = new MongoClient(uri)
      await client.connect()
      const dbName = process.env.MONGODB_DB_NAME || 'miku_bot'
      db = client.db(dbName)
      console.log('[MONGODB] Conectado exitosamente a la base de datos.')
    } catch (err) {
      console.error('[MONGODB ERROR] Falló la conexión:', err.message)
      throw err
    }
  }

  return db
}
