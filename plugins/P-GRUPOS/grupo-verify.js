import { jidNormalizedUser } from '@whiskeysockets/baileys'
import GroupDb from '../../lib/database/GroupDb.js'

// Anti-raid: cuando alguien nuevo entra a un grupo con .verify activado, se
// le manda un código por privado y tiene un tiempo límite para escribirlo de
// vuelta — si no lo hace, se lo expulsa automáticamente. WhatsApp no tiene
// "silenciar a un usuario" real (a diferencia de Discord), así que la única
// consecuencia posible acá es la expulsión.
const pending = new Map() // jid -> { groupId, code, timer }

const VERIFY_TIMEOUT_MS = 5 * 60 * 1000

function generarCodigo() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export async function manejarVerificacion(conn, update) {
  const { id, participants, action } = update
  if (action !== 'add' || !id) return

  try {
    const groupDb = await GroupDb.findOrCreate(jidNormalizedUser(id))
    if (!groupDb.verifyEnabled) return

    const meta = await conn.groupMetadata(id).catch(() => null)
    const groupName = meta?.subject || 'el grupo'

    for (const item of participants) {
      const jid = jidNormalizedUser(typeof item === 'string' ? item : (item?.id || item?.jid))
      if (!jid || jid === jidNormalizedUser(conn.user.id)) continue
      if (pending.has(jid)) continue

      const code = generarCodigo()

      const timer = setTimeout(async () => {
        pending.delete(jid)
        try {
          await conn.groupParticipantsUpdate(id, [jid], 'remove')
          await conn.sendMessage(id, {
            text: `*『 🚫 』VERIFICACIÓN FALLIDA*\n> @${jid.split('@')[0]} no se verificó a tiempo y fue expulsado.`,
            mentions: [jid]
          })
        } catch (e) {
          console.error('[VERIFY TIMEOUT ERROR]', e.message)
        }
      }, VERIFY_TIMEOUT_MS)

      pending.set(jid, { groupId: id, code, timer })

      try {
        await conn.sendMessage(jid, {
          text: `*『 🔐 』VERIFICACIÓN REQUERIDA*\n> Te uniste a *${groupName}*.\n> Escribime este código acá en los próximos ${Math.floor(VERIFY_TIMEOUT_MS / 60000)} minutos para confirmar que sos una persona real:\n\n*${code}*\n\n> Si no lo hacés a tiempo, vas a ser expulsado del grupo automáticamente.`
        })
      } catch {
        // No se le pudo mandar DM (privacidad, número no en WhatsApp, etc.)
        // — cancelamos la verificación en vez de expulsar a alguien que
        // nunca tuvo la chance de responder.
        clearTimeout(timer)
        pending.delete(jid)
      }
    }
  } catch (e) {
    console.error('[VERIFY ERROR]', e.message)
  }
}

const handler = async (m, { args, groupDb }) => {
  const option = args[0]?.toLowerCase()
  if (!option) {
    return m.reply(`*『 🔐 』ANTI-RAID (VERIFY)*\n> Estado: ${groupDb.verifyEnabled ? '✅ ON' : '❌ OFF'}\n> *Uso:* .verify on / off`)
  }
  if (['on', '1', 'true', 'activar'].includes(option)) {
    groupDb.verifyEnabled = true
    await groupDb.save()
    return m.reply(`*『 ✅ 』VERIFY ACTIVADO*\n> Los miembros nuevos van a tener que verificarse por privado o serán expulsados.`)
  }
  if (['off', '0', 'false', 'desactivar'].includes(option)) {
    groupDb.verifyEnabled = false
    await groupDb.save()
    return m.reply(`*『 ❌ 』VERIFY DESACTIVADO*`)
  }
  return m.reply(`*『 ❕ 』OPCIÓN INVÁLIDA*\n> Usa: .verify on / off`)
}

handler.all = async function (m) {
  if (m.isGroup || m.fromMe || !m.sender) return
  const entry = pending.get(m.sender)
  if (!entry) return

  const texto = (m.body || '').trim()
  if (texto !== entry.code) {
    return m.reply(`*『 ❌ 』Código incorrecto. Intentá de nuevo.*`)
  }

  clearTimeout(entry.timer)
  pending.delete(m.sender)
  await m.reply(`*『 ✅ 』¡VERIFICADO!*\n> Ya podés participar normalmente en el grupo. Bienvenido/a.`)
}

handler.help = ['verify <on/off>']
handler.desc = 'Anti-raid: los miembros nuevos deben verificarse por privado o son expulsados automáticamente.'
handler.tags = ['group']
handler.command = ['verify', 'verificar']
handler.groupOnly = true
handler.adminOnly = true
handler.manejarVerificacion = manejarVerificacion

export default handler
