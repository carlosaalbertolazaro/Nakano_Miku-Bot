import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { initAuthCreds, BufferJSON, proto } = pkg

/**
 * Proveedor de autenticación persistente en MongoDB para Baileys.
 * Permite mantener la sesión activa aun cuando el contenedor de Render se reinicie.
 */
export async function useMongoAuthState(collection) {
  const writeData = async (data, id) => {
    try {
      await collection.updateOne(
        { _id: id },
        { $set: { data: JSON.stringify(data, BufferJSON.replacer) } },
        { upsert: true }
      )
    } catch (e) {
      console.error(`[AUTH:MONGO] Error al guardar ${id}:`, e.message)
    }
  }

  const readData = async (id) => {
    try {
      const doc = await collection.findOne({ _id: id })
      if (!doc || !doc.data) return null
      return JSON.parse(doc.data, BufferJSON.reviver)
    } catch {
      return null
    }
  }

  const removeData = async (id) => {
    try {
      await collection.deleteOne({ _id: id })
    } catch {}
  }

  const creds = (await readData('creds')) || initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {}
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`)
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value)
              }
              data[id] = value
            })
          )
          return data
        },
        set: async (data) => {
          const tasks = []
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id]
              const sId = `${category}-${id}`
              tasks.push(value ? writeData(value, sId) : removeData(sId))
            }
          }
          await Promise.all(tasks)
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds'),
  }
}
