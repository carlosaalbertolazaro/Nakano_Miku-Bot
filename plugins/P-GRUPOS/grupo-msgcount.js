import { jidNormalizedUser } from '@whiskeysockets/baileys'
import UserDb from '../../lib/database/UserDb.js'

// Complementa a .actividad/.inactivos (grupo-actividad.js), que son
// rankings — esto es la consulta puntual de UNA persona.
const handler = async (m, { args, text }) => {
  if (!m.isGroup) return m.reply(`*『 👥 』SOLO GRUPOS.*`)

  let who = m.mentionedJid?.[0]
    || (m.quoted ? m.quoted.sender : null)
    || (text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null)
    || m.sender
  who = jidNormalizedUser(who)

  const user = await UserDb.findOrCreate(who)
  const count = user.activity?.[m.chat] || 0

  await m.reply(`*『 📨 』MENSAJES DE @${who.split('@')[0]}*\n> *${count}* mensajes en este grupo.`, { mentions: [who] })
}

handler.help = ['msgcount [@user]']
handler.desc = 'Ver cuántos mensajes mandó una persona en este grupo (usá .actividad para el ranking completo).'
handler.tags = ['group']
handler.command = ['msgcount', 'count', 'messages', 'mensajes']
handler.groupOnly = true

export default handler
